/* eslint-disable @typescript-eslint/no-namespace */
import { Context, h, Session } from 'koishi'
import { Config } from './config'
import Vits from '@initencounter/vits'
import { VitsAdapter } from './adapters/base'
import { VitsConfig } from './type'
import { SpeakerRegistry } from './registry'
import type {} from '@koishijs/translator'
import type {} from '@koishijs/plugin-console'

/** TTS 失败后的熔断时长：Infinity 表示永久熔断，需手动 `tts 开` 解除 */
export const TTS_CIRCUIT_COOLDOWN = Infinity

let ttsCircuitOpenUntil = 0
let ttsManualDisabled = false
let ttsLastFailure: { time: number; message: string } | null = null

export interface TtsStatus {
    manualDisabled: boolean
    circuitOpenUntil: number
    lastFailure: { time: number; message: string } | null
    cooldown: number
}

export function getTtsStatus(): TtsStatus {
    return {
        manualDisabled: ttsManualDisabled,
        circuitOpenUntil: ttsCircuitOpenUntil,
        lastFailure: ttsLastFailure,
        cooldown: TTS_CIRCUIT_COOLDOWN
    }
}

/** 重新开启语音并清除熔断与失败记录 */
export function resetTtsCircuit() {
    ttsManualDisabled = false
    ttsCircuitOpenUntil = 0
    ttsLastFailure = null
}

/** 临时关闭语音（进程内生效，重启恢复） */
export function disableTts() {
    ttsManualDisabled = true
}

/**
 * TTS 核心引擎：不依赖 koishi 的服务注册机制，
 * Koishi 4.x（ChatLuna v1）与 ChatLuna v2（cordis）通用。
 */
export class LunaVitsEngine {
    private _adapters: Record<string, VitsAdapter> = {}

    /** speaker 注册表：不依赖 console，ChatLuna v2 下同样可用 */
    readonly registry: SpeakerRegistry

    constructor(
        public ctx: Context,
        public config: Config
    ) {
        this.registry = new SpeakerRegistry(ctx, config, (c) =>
            this.getSpeakerList(c)
        )
    }

    addAdapter(adapter: VitsAdapter) {
        this._adapters[adapter.type] = adapter
    }

    async predict(
        input: string,
        options: VitsAdapter.Config,
        session?: Session
    ): Promise<h> {
        if (ttsManualDisabled) {
            throw new Error(
                'TTS disabled by command (send "tts 开" to enable)'
            )
        }

        if (Date.now() < ttsCircuitOpenUntil) {
            throw new Error('TTS unavailable (circuit open, retry later)')
        }

        if (input.length > this.config.maxLength) {
            return h.text('输入的字符串长度不能超过 ' + this.config.maxLength)
        }

        let lang = (options.speaker as string)?.split('_')?.pop()

        if (!lang) {
            lang = 'ZH'
        }

        const speakerKeyMap = this.registry.getSpeakerKeyMap()

        if (this.config.autoTranslate) {
            this.ctx.logger.debug(
                'input sentence (origin) %s, lang: %s',
                input,
                lang
            )
            input = await this.checkLanguage(input, lang)
        }

        this.ctx.logger.debug('input sentence %s', input)

        const currentConfig = speakerKeyMap[options.speaker as string]

        if (!currentConfig) {
            throw new Error('Speaker not found')
        }

        try {
            const result = await this._adapters[currentConfig[0].type].predict(
                input,
                currentConfig[0],
                Object.assign(
                    {
                        language: lang
                    },
                    options,
                    {
                        speaker: currentConfig[1]
                    }
                ),
                session
            )

            ttsCircuitOpenUntil = 0

            return result
        } catch (error) {
            // 首次失败即熔断：不再重试，后续调用直接快速失败，
            // 避免 TTS 不可用时每次回复都空转等待。
            ttsCircuitOpenUntil = Date.now() + TTS_CIRCUIT_COOLDOWN
            ttsLastFailure = {
                time: Date.now(),
                message: String(
                    (error as Error)?.message ?? error
                ).slice(0, 160)
            }
            throw error
        }
    }

    async say(options: Vits.Result): Promise<h> {
        const speakerKeyIdMap = this.registry.getSpeakerKeyIdMap()

        return this.predict(
            options.input,
            {
                speaker:
                    speakerKeyIdMap[options.speaker_id]?.[1] ??
                    this.config.defaultSpeaker
            },
            options['session']
        )
    }

    getSpeakerList(config: VitsConfig) {
        // 适配器由 apply 延迟注册；首次 refresh 可能早于注册，
        // 此时 _adapters[config.type] 为 undefined，直接调用会抛错。
        // 返回空列表，等适配器就绪后的 refresh 再加载 speakers。
        const adapter = this._adapters[config.type]
        if (!adapter) {
            return []
        }
        return adapter.getSpeakerList(config)
    }

    private async checkLanguage(input: string, lang: string): Promise<string> {
        try {
            const franc = await importFranc()
            lang = lang.toLocaleLowerCase()

            const sourceLanguage =
                francLanguageMapping[franc.franc(input)] ?? lang

            if (sourceLanguage === lang || !this.config.autoTranslate) {
                return input
            }

            return this.ctx.translator.translate({
                input,
                source: sourceLanguage.toLocaleLowerCase(),
                target: lang
            })
        } catch (error) {
            return input
        }
    }
}

/**
 * Koishi 4.x / ChatLuna v1 的 `vits` 服务包装。
 *
 * ChatLuna v2（cordis）下 koishi 的 Service 注册不可靠，此时不注册本服务，
 * voice handler 直接使用 {@link LunaVitsEngine}。
 */
export class LunaVitsService extends Vits {
    public engine: LunaVitsEngine

    constructor(
        ctx: Context,
        options: { config: Config; engine: LunaVitsEngine }
    ) {
        super(ctx)

        this.engine = options.engine
    }

    predict(input: string, options: VitsAdapter.Config, session?: Session) {
        return this.engine.predict(input, options, session)
    }

    say(options: Vits.Result) {
        return this.engine.say(options)
    }

    getSpeakerList(config: VitsConfig) {
        return this.engine.getSpeakerList(config)
    }
}

const francLanguageMapping: Record<string, string> = {
    jpn: 'jp',
    zho: 'zh',
    eng: 'en',
    spa: 'es',
    fra: 'fr',
    deu: 'de',
    ita: 'it',
    por: 'pt',
    rus: 'ru',
    kor: 'ko',
    ara: 'ar',
    heb: 'he',
    hin: 'hi',
    tur: 'tr',
    vie: 'vi',
    cmn: 'zh',
    ell: 'el'
}

async function importFranc() {
    try {
        return await import('franc-min')
    } catch (e) {
        throw new Error(
            'Please install franc-min as a dependency with, e.g. `npm install -S franc-min`'
        )
    }
}
