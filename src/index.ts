/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable max-len */
import { Context } from 'koishi'
import { Config } from './config'
import {
    LunaVitsEngine,
    LunaVitsService,
    getTtsStatus,
    resetTtsCircuit,
    disableTts
} from './service'
import {
    GPTSoVITS2Adapter,
    VitsSimpleAPIAdapter,
    GradioAdapter
} from './adapters'
import { resolve } from 'path'
import type {} from '@koishijs/plugin-console'
import { LunaVitsProvider } from './constants'
import { getSpeaker } from './utils'
import { FishAudioAdapter } from './adapters/fish_audio'
import { QQVoiceAdapter } from './adapters/qq_voice'
import { applyChatlunaV2 } from './v2'

export function apply(ctx: Context, config: Config) {
    const logger = ctx.logger('local-vits')

    // 核心引擎：不依赖 koishi 服务注册，Koishi 4.x 与 ChatLuna v2 通用
    const engine = new LunaVitsEngine(ctx, config)

    // 控制台前端入口：仅在 Koishi 4.x 提供 console 服务时启用
    ctx.inject(['console'], (ctx) => {
        ctx.console.addEntry({
            dev: resolve(__dirname, '../client/index.ts'),
            prod: resolve(__dirname, '../dist')
        })
    })

    // Koishi 4.x / ChatLuna v1 的 vits 服务包装；ChatLuna v2（cordis）下
    // koishi Service 注册不可靠，此时不注册，voice handler 直接用 engine。
    try {
        ctx.plugin(LunaVitsService, { config, engine })
    } catch (e) {
        logger.debug('vits 服务注册失败（v2 下可忽略）: %s', String(e))
    }

    engine.addAdapter(new GPTSoVITS2Adapter(ctx))
    engine.addAdapter(new VitsSimpleAPIAdapter(ctx))
    engine.addAdapter(new FishAudioAdapter(ctx))
    engine.addAdapter(new QQVoiceAdapter(ctx))

    ctx.inject(['gradio'], () => {
        engine.addAdapter(new GradioAdapter(ctx))
    })

    // 加载 data/local-vits/config.yml（不存在时复制默认配置）并拉取 speaker 列表
    void engine.registry
        .refresh()
        .then(() => {
            logger.info(
                'speaker 注册表已加载：%s 个',
                Object.keys(engine.registry.getSpeakerKeyMap()).length
            )
        })
        .catch((e) => {
            logger.warn('加载 speaker 失败: %s', String(e))
        })

    // 控制台数据服务：仅 Koishi 4.x（console + vits 服务都存在）时注册
    ctx.inject({ console: { required: false } }, (ctx) => {
        if (!ctx.get('console') || !ctx.get('vits')) return
        ctx.plugin(LunaVitsProvider, config)
    })

    ctx.command(
        'tts [action:string]',
        'TTS 状态与控制（状态/开/关）',
        { authority: 3 }
    ).action((_, action) => {
        const a = String(action ?? '')
            .trim()
            .toLowerCase()

        if (a === '开' || a === 'on') {
            resetTtsCircuit()
            return '语音已开启，熔断已清除。'
        }

        if (a === '关' || a === 'off') {
            disableTts()
            return '语音已关闭：之后只发文字（发 tts 开 恢复）。'
        }

        const { manualDisabled, circuitOpenUntil, lastFailure, cooldown } =
            getTtsStatus()
        const now = Date.now()
        const state = manualDisabled
            ? '已手动关闭'
            : now < circuitOpenUntil
              ? '熔断中'
              : '正常'

        const rows = [`#TTS 状态：${state}`]

        if (!manualDisabled && now < circuitOpenUntil) {
            rows.push(
                circuitOpenUntil === Infinity
                    ? '冷却：永久（发 tts 开 解除）'
                    : `冷却剩余：${Math.ceil((circuitOpenUntil - now) / 1000)} 秒`
            )
        }

        if (lastFailure) {
            rows.push(
                `上次失败：${new Date(lastFailure.time).toLocaleString('zh-CN')} — ${lastFailure.message}`
            )
        }

        rows.push(
            `冷却时长：${cooldown === Infinity ? '永久（手动解除）' : cooldown / 1000 + ' 秒'}`
        )

        return rows.join('\n')
    })

    ctx.command('lunavits <text:text>', 'lunavits 语音合成')
        .option('speaker', '-s [speaker:string] 语音合成的讲者', {
            fallback: config.defaultSpeaker
        })
        .option(
            'sdp_ratio',
            '-sr [sdp_ratio:nubmer] 语音合成的SDP/DP混合比'
        )
        .option('noise', '-n [noise:number] 语音合成的感情强度')
        .option('noisew', '-nw [noisew:number] 语音合成的音素长度')
        .option('length', '-l [length:number] 语音合成语速')
        .option('weight', '-w [weight:number] 主文本和辅助文本的混合比率')
        .option(
            'temperature',
            '-t [temperature:number] 合成的温度（GPT-SOVITS-ONLY）'
        )
        .option(
            'text_split_method',
            '-ts [text_split_method:string] 语音合成的文本分割方法（GPT-SOVITS-ONLY）'
        )
        .option(
            'speed',
            '-sp [speed:number] 语音合成的语速（GPT-SOVITS-ONLY）'
        )
        .action(async ({ session, options }, text) => {
            if (!text) {
                await session.execute('lunavits -h')
                return null
            }

            const speakerKeyMap = engine.registry.getSpeakerKeyMap()

            const [speakerConfig, finalSpeaker] = getSpeaker(
                ctx,
                speakerKeyMap,
                options.speaker ?? config.defaultSpeaker
            )

            if (!speakerConfig) {
                return `找不到这个 ${finalSpeaker} 讲者，请检查你的输入。`
            }

            return await engine.predict(
                text,
                Object.assign(options, {
                    speaker: finalSpeaker
                }),
                session
            )
        })

    // ChatLuna v2（cordis）下通过 voice 服务的 handler 接入 <voice> 语音链路；
    // Koishi 4.x / ChatLuna v1 没有 voice 服务，此调用不产生副作用。
    applyChatlunaV2(ctx, config, engine)
}

export * from './config'
