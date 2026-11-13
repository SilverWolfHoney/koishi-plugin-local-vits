import path from 'path'
import fs, { watch } from 'fs'
import { load } from 'js-yaml'
import { Context } from 'koishi'
import { Config } from './config'
import {
    FishAudioSpeaker,
    GradioConfig,
    GradioSpeaker,
    QQVoiceSpeaker,
    Speaker,
    VitsConfig,
    VitsSimpleApiSpeaker
} from './type'
import { PromiseLock } from './utils'

let baseSpeakId = 114514

/**
 * speaker 注册表：从 data/local-vits/config.yml 读取后端配置，拉取 speaker 列表，
 * 并维护 speaker 名 -> (配置, speaker) 的映射。
 *
 * 该逻辑原本依赖 @koishijs/plugin-console 的 DataService；ChatLuna v2（cordis）
 * 下 console 服务不可用，因此抽成独立类，v1 控制台与 v2 voice handler 共用。
 */
export class SpeakerRegistry {
    vitsConfig: VitsConfig[] = []

    speakerKeyIdMap: Record<number, [VitsConfig, string, Speaker]> = {}

    speakerKeyMap: Record<string, [VitsConfig, Speaker]> = {}

    private readonly lock = new PromiseLock()

    private abortController = new AbortController()

    constructor(
        public ctx: Context,
        public config: Config,
        private getSpeakerList: (
            config: VitsConfig
        ) => Speaker[] | Promise<Speaker[]>
    ) {}

    resolveConfigDir() {
        // ChatLuna v2（cordis）下直接访问 ctx.baseDir 会触发 inject 限制，
        // 用进程工作目录兜底（v2 的 data 目录就在 cwd 下）。
        let baseDir = process.cwd()

        try {
            baseDir = (this.ctx as { baseDir?: string }).baseDir ?? baseDir
        } catch {
            // cordis: cannot get property "baseDir" without inject
        }

        return path.resolve(baseDir, 'data/local-vits')
    }

    resolveConfigPath() {
        return path.resolve(this.resolveConfigDir(), 'config.yml')
    }

    async refresh() {
        await this.lock.lock()

        try {
            this.vitsConfig = await this.loadConfig()
            this.speakerKeyIdMap = this.mapSpeakers()
            this.speakerKeyMap = this.mapSpeakerKey()
        } finally {
            this.lock.unlock()
        }

        this.watchConfig()
    }

    async loadConfig(): Promise<VitsConfig[]> {
        try {
            await fs.promises.access(this.resolveConfigPath())
        } catch {
            const defaultPath = path.join(__dirname, '../resources/config.yml')

            try {
                await fs.promises.mkdir(this.resolveConfigDir(), {
                    recursive: true
                })
            } catch {
                //
            }

            await fs.promises.copyFile(defaultPath, this.resolveConfigPath())
        }

        const configs = load(
            await fs.promises.readFile(this.resolveConfigPath(), 'utf-8')
        ) as VitsConfig[]

        const managed = this.buildManagedConfig()
        if (managed) configs.push(managed)

        const filteredConfigs = configs
            .filter((c) => c.enabled === true || c.enabled == null)
            .map(async (config) => {
                const speakerList = await this.getSpeakerList(config)

                config.speakers = speakerList

                return config
            })

        return await Promise.all(filteredConfigs)
    }

    /** 从控制台插件配置构造一个 vits-simple-api 后端（启用时） */
    private buildManagedConfig(): VitsConfig | null {
        const managed = this.config?.vitsApi
        if (!managed?.enabled || !managed.url) return null

        return {
            name: '控制台 Vits-Simple-API',
            type: 'vits-simple-api',
            enabled: true,
            url: managed.url.replace(/\/+$/, ''),
            config: {
                auto_pull_speaker: managed.autoPullSpeaker ?? true,
                api_key: managed.apiKey || undefined,
                username: managed.username || undefined,
                password: managed.password || undefined,
                timeout: managed.timeout ?? 60000
            },
            speakers: []
        }
    }

    watchConfig() {
        if (this.abortController) {
            this.abortController.abort()
        }

        this.abortController = new AbortController()

        const debounceFn = this.ctx.debounce(async () => {
            this.ctx.logger.info('Configuration changed, refreshing')
            await this.refresh()
            this.ctx.logger.info(
                `Successfully loaded ${Object.keys(this.speakerKeyIdMap).length} speakers`
            )
        }, 300) // Adjust the debounce delay as needed

        try {
            watch(
                this.resolveConfigPath(),
                {
                    signal: this.abortController.signal
                },
                async () => {
                    await debounceFn()
                }
            )
        } catch (e) {
            this.ctx.logger.warn('watch config failed: %s', String(e))
        }
    }

    processSpeaker(
        speaker: Speaker,
        config: VitsConfig,
        result: [VitsConfig, string, Speaker][]
    ) {
        if (config.type === 'GPT-SoVITS2') {
            // five languages

            for (const language of ['ZH', 'EN', 'JA', 'KO', 'YUO', 'AUTO']) {
                result.push([config, `${speaker.name}_${language}`, speaker])
            }
        } else if (config.type === 'gradio') {
            const requestConfig = config.config as GradioConfig
            speaker = speaker as GradioSpeaker

            const languages = (requestConfig.languages as string[]) ?? [
                'ZH',
                'EN',
                'JA',
                'AUTO'
            ]
            if (languages) {
                for (const language of languages) {
                    result.push([
                        config,
                        `${speaker.name}_${language.toUpperCase()}`,
                        speaker
                    ])
                }
            }
        } else if (config.type === 'vits-simple-api') {
            speaker = speaker as VitsSimpleApiSpeaker

            const languages = speaker.languages
            if (languages) {
                for (const language of languages) {
                    result.push([
                        config,
                        `${speaker.name}_${language.toUpperCase()}`,
                        speaker
                    ])
                }
            }
            result.push([config, `${speaker.name}_AUTO`, speaker])
        } else if (config.type === 'qq-voice') {
            speaker = speaker as QQVoiceSpeaker

            result.push([config, `QQ_${speaker.name}_AUTO`, speaker])
        } else if (config.type === 'fish-audio') {
            speaker = speaker as FishAudioSpeaker

            const languages = speaker.languages
            if (languages) {
                for (const language of languages) {
                    result.push([
                        config,
                        `${speaker.name}_${language.toUpperCase()}`,
                        speaker
                    ])
                }
            }
            result.push([config, `${speaker.name}_AUTO`, speaker])
        }
    }

    mapSpeakers() {
        // 按 speaker key 去重：插件 reload / 多次 refresh 时，
        // 旧实例与多份配置可能产生同名条目，导致控制台下拉出现重复项。
        const seen = new Set<string>()
        return this.vitsConfig
            .flatMap((config) => {
                const result: [VitsConfig, string, Speaker][] = []

                for (const speaker of config.speakers) {
                    this.processSpeaker(speaker, config, result)
                }

                return result
            })
            .filter((entry) => {
                const key = entry[1]
                if (seen.has(key)) return false
                seen.add(key)
                return true
            })
            .sort((a, b) => (a[1] < b[1] ? 1 : -1))
            .map((k) => [k, baseSpeakId++])
            .reduce(
                (acc, [k, v]) => {
                    acc[v as number] = k as [VitsConfig, string, Speaker]
                    return acc
                },
                {} as Record<number, [VitsConfig, string, Speaker]>
            )
    }

    mapSpeakerKey() {
        return Object.fromEntries(
            Object.entries(this.speakerKeyIdMap).map(([k, v]) => [
                v[1],
                [v[0], v[2]] as [VitsConfig, Speaker]
            ])
        )
    }

    stop() {
        this.abortController.abort()
    }

    getSpeakerKeyMap() {
        return this.speakerKeyMap
    }

    getSpeakerKeyIdMap() {
        return this.speakerKeyIdMap
    }

    getVitsConfig() {
        return this.vitsConfig
    }
}
