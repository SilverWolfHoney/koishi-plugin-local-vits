/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable max-len */
import { Context } from 'koishi'
import { Config } from './config'
import { LunaVitsService, getTtsStatus, resetTtsCircuit, disableTts } from './service'
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

export function apply(ctx: Context, config: Config) {
    ctx.inject(['console'], (ctx) => {
        ctx.console.addEntry({
            dev: resolve(__dirname, '../client/index.ts'),
            prod: resolve(__dirname, '../dist')
        })
    })

    ctx.plugin(LunaVitsService, config)
    ctx.plugin(LunaVitsProvider)

    ctx.inject(
        {
            vits: {
                required: true
            },
            console: {
                required: true
            },
            'console.services.luna_vits_data': {
                required: true
            },
            gradio: {
                required: false
            }
        },
        async (ctx) => {
            const lunaVits = ctx.vits as LunaVitsService

            lunaVits.addAdapter(new GPTSoVITS2Adapter(lunaVits.ctx))
            lunaVits.addAdapter(new VitsSimpleAPIAdapter(lunaVits.ctx))
            lunaVits.addAdapter(new FishAudioAdapter(lunaVits.ctx))
            lunaVits.addAdapter(new QQVoiceAdapter(lunaVits.ctx))

            ctx.inject(['gradio'], async () => {
                lunaVits.addAdapter(new GradioAdapter(lunaVits.ctx))

                await ctx.console.services.luna_vits_data.refresh()
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
                .option(
                    'weight',
                    '-w [weight:number] 主文本和辅助文本的混合比率'
                )
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

                    const speakerKeyMap =
                        await ctx.console.services.luna_vits_data.getSpeakerKeyMap()

                    const [speakerConfig, finalSpeaker] = getSpeaker(
                        ctx,
                        speakerKeyMap,
                        options.speaker ?? config.defaultSpeaker
                    )

                    if (!speakerConfig) {
                        return `找不到这个 ${finalSpeaker} 讲者，请检查你的输入。`
                    }

                    const lunaVits = ctx.vits as LunaVitsService

                    return await lunaVits.predict(
                        text,
                        Object.assign(options, {
                            speaker: finalSpeaker
                        }),
                        session
                    )
                })

            await ctx.console.services.luna_vits_data.refresh()
        }
    )
}

export * from './config'
