import { Context, h } from 'koishi'
import { Config } from './config'
import { LunaVitsService } from './service'

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

/**
 * ChatLuna v2（cordis 架构）适配。
 *
 * v2 的语音链路走 `@chatluna/chat-voice` 的 `voice` 服务：模型输出
 * `<voice>` 元素时由 handler 链渲染。这里注册一个 handler，把文本交给
 * local-vits 合成；失败时降级给后续 handler（例如 @speak 模型）或纯文本。
 *
 * Koishi 4.x / ChatLuna v1 没有 `voice` 服务，`ctx.inject(['voice'])`
 * 不会触发，对旧环境无副作用。
 */
export function applyChatlunaV2(ctx: Context, config: Config) {
    const logger = ctx.logger('local-vits')

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

                try {
                    const lunaVits = ctx.vits as LunaVitsService

                    if (!lunaVits?.predict) {
                        throw new Error('vits 服务尚未就绪')
                    }

                    const result = await lunaVits.predict(
                        text,
                        { speaker: request.voice || config.defaultSpeaker },
                        request.session as never
                    )

                    // predict 返回单个元素（音频或提示文本），voice handler 需要元素数组
                    return [result]
                } catch (error) {
                    logger.warn(
                        'voice 合成失败，降级到后续处理: %s',
                        String((error as Error)?.message ?? error)
                    )

                    return next ? await next(request) : h.text(text)
                }
            },
            { order: 100 }
        )

        logger.info(
            '已注册 ChatLuna v2 voice handler：<voice> 元素将优先走 local-vits 合成'
        )
    })
}
