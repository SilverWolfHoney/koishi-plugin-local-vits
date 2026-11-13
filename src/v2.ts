import { Context, h } from 'koishi'
import { Config } from './config'
import { LunaVitsEngine } from './service'

/** `@chatluna/chat-voice` 的 voice handler 请求（只声明用到的字段） */
interface VoiceRequest {
    text?: string
    voice?: string
    style?: string
    session?: unknown
    attrs?: Record<string, unknown>
    children?: unknown[]
}

type VoiceNext = (request?: VoiceRequest) => Promise<unknown>

/** ChatLuna v2 中 voice 服务的最小接口 */
interface VoiceService {
    handler(
        handler: (request: VoiceRequest, next?: VoiceNext) => Promise<unknown>,
        options?: { order?: number }
    ): unknown
}

/** before-send 的 payload 最小结构（chatluna 未导出类型，这里只声明用到的字段） */
interface BeforeSendPayload {
    content?: unknown
    session?: unknown
}

function textOf(element: h): string {
    if (element.type === 'text') {
        return String(element.attrs?.content ?? '')
    }

    return (element.children ?? []).map((child) => textOf(child)).join('')
}

/** 把纯文本里的 `<voice ...>...</voice>` 拆成 text/voice 片段 */
function splitVoiceTags(
    raw: string
): Array<{ kind: 'text' | 'voice'; text: string; voice?: string }> {
    const re = /<voice(\s[^>]*)?>([\s\S]*?)<\/voice>/gi
    const out: Array<{ kind: 'text' | 'voice'; text: string; voice?: string }> =
        []

    let last = 0
    let match: RegExpExecArray | null

    while ((match = re.exec(raw)) !== null) {
        if (match.index > last) {
            out.push({ kind: 'text', text: raw.slice(last, match.index) })
        }

        const attrs = match[1] ?? ''
        const voiceAttr = /voice\s*=\s*["']([^"']*)["']/i.exec(attrs)

        out.push({ kind: 'voice', text: match[2], voice: voiceAttr?.[1] })
        last = re.lastIndex
    }

    if (last < raw.length) {
        out.push({ kind: 'text', text: raw.slice(last) })
    }

    return out
}

/**
 * ChatLuna v2（cordis 架构）适配。
 *
 * 三条路径：
 * 1. `voice` 服务的 handler（官方扩展点）：模型输出被解析成 `<voice>` 元素时触发；
 * 2. `chat/before-send` 兜底：实测 v2 里模型常把 `<voice>...</voice>` 当普通文本输出
 *    （元素不在「当前可见元素」集合时按文本发送），这里在发送前递归遍历内容并转成音频。
 *
 * 都失败时降级为原文本，不会阻断回复。
 * Koishi 4.x / ChatLuna v1 没有这些服务/事件，对旧环境无副作用。
 */
export function applyChatlunaV2(
    ctx: Context,
    config: Config,
    engine: LunaVitsEngine
) {
    const logger = ctx.logger('local-vits')

    const synthesize = async (
        text: string,
        session: unknown,
        voice?: string
    ): Promise<h[] | null> => {
        const trimmed = text.trim()

        if (!trimmed) return null

        const keyMap = engine.registry.getSpeakerKeyMap()
        const keys = Object.keys(keyMap)
        const voiceName = voice ?? ''
        const defaultName = config.defaultSpeaker ?? ''

        const speaker = keyMap[voiceName]
            ? voiceName
            : keyMap[defaultName]
              ? defaultName
              : keys[0]

        if (!speaker) {
            logger.warn('没有可用的 TTS 讲者（请检查 data/local-vits/config.yml）')
            return null
        }

        try {
            const result = await engine.predict(
                trimmed,
                { speaker },
                session as never
            )

            return h.normalize([result])
        } catch (error) {
            logger.warn(
                'voice 合成失败，保留原文本: %s',
                String((error as Error)?.message ?? error)
            )
            return null
        }
    }

    // ---- 官方路径：voice 服务的 handler ----
    ctx.inject(['voice'], (ctx) => {
        const voice = ctx.get('voice') as VoiceService | undefined

        if (!voice?.handler) {
            return
        }

        voice.handler(
            async (request, next) => {
                const text = String(request?.text ?? '').trim()

                if (!text) {
                    return []
                }

                logger.info(
                    'voice handler 被调用：voice=%s, text=%s',
                    request?.voice ?? '',
                    text.slice(0, 30)
                )

                const audio = await synthesize(
                    text,
                    request?.session,
                    request?.voice
                )

                if (audio) {
                    return audio
                }

                return next ? await next(request) : h.text(text)
            },
            { order: 100 }
        )

        logger.info(
            '已注册 ChatLuna v2 voice handler（voice.handlers=%s）',
            (voice as { handlers?: unknown[] }).handlers?.length ?? 'n/a'
        )
    })

    // ---- 兜底路径：递归遍历发送内容，把 <voice> 文本/元素转成音频 ----
    // `chat/before-send` 是 ChatLuna 的 waterfall 事件，不在 koishi 的事件类型里。
    ;(
        ctx as unknown as {
            on: (
                name: string,
                listener: (
                    payload: BeforeSendPayload,
                    next: () => Promise<unknown>
                ) => Promise<unknown>
            ) => void
        }
    ).on(
        'chat/before-send',
        async (payload: BeforeSendPayload, next: () => Promise<unknown>) => {
            if (payload?.content === void 0) {
                return next()
            }

            const roots = h.normalize(payload.content as string | h[])

            if (!roots.some((element) => hasVoiceMarkup(element))) {
                return next()
            }

            logger.info('before-send 检测到 voice 标记，开始转换')

            const convert = async (
                element: h
            ): Promise<{ elements: h[]; changed: boolean }> => {
                if (element.type === 'voice') {
                    const text = textOf(element).trim()

                    const audio = await synthesize(
                        text,
                        payload.session,
                        String(element.attrs?.voice ?? '')
                    )

                    if (audio) {
                        logger.info('before-send 已转换 voice 元素: %s', text)
                        return { elements: audio, changed: true }
                    }

                    return { elements: [element], changed: false }
                }

                if (element.type === 'text') {
                    const raw = String(element.attrs?.content ?? '')

                    if (/<voice(?:\s[^>]*)?>/i.test(raw)) {
                        const parts = splitVoiceTags(raw)
                        const elements: h[] = []
                        let converted = false

                        for (const part of parts) {
                            if (part.kind === 'text') {
                                if (part.text !== '') {
                                    elements.push(h.text(part.text))
                                }
                                continue
                            }

                            const audio = await synthesize(
                                part.text,
                                payload.session,
                                part.voice
                            )

                            if (audio) {
                                elements.push(...audio)
                                converted = true
                                logger.info(
                                    'before-send 已把文本标签转换为音频: %s',
                                    part.text.slice(0, 30)
                                )
                            } else {
                                elements.push(h.text(part.text))
                            }
                        }

                        return { elements, changed: converted }
                    }

                    return { elements: [element], changed: false }
                }

                if (element.children !== undefined && element.children.length > 0) {
                    const children: h[] = []
                    let changed = false

                    for (const child of element.children) {
                        const result = await convert(child)
                        children.push(...result.elements)
                        if (result.changed) changed = true
                    }

                    if (changed) {
                        return {
                            elements: [h(element.type, element.attrs, children)],
                            changed: true
                        }
                    }
                }

                return { elements: [element], changed: false }
            }

            const out: h[] = []
            let changed = false

            for (const root of roots) {
                const result = await convert(root)
                out.push(...result.elements)
                if (result.changed) changed = true
            }

            if (changed) {
                payload.content = h.normalize(out)
            }

            return next()
        }
    )

    logger.info('chat/before-send 兜底监听器已注册')
}

/** 元素树里是否含 voice 元素或文本里的 `<voice>` 标签 */
function hasVoiceMarkup(element: h): boolean {
    if (element.type === 'voice') return true

    if (
        element.type === 'text' &&
        /<voice(?:\s[^>]*)?>/i.test(String(element.attrs?.content ?? ''))
    ) {
        return true
    }

    return (element.children ?? []).some((child) => hasVoiceMarkup(child))
}
