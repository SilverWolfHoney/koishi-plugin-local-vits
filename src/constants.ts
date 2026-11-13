import path from 'path'
import fs from 'fs'
import { Context, Schema } from 'koishi'
import { DataService } from '@koishijs/plugin-console'
import { Config } from './config'
import { LunaVitsService } from './service'
import { SpeakerRegistry } from './registry'

/**
 * 控制台数据服务（仅 Koishi 4.x / ChatLuna v1 的 console 可用时注册）。
 *
 * speaker 的加载/映射逻辑已抽到 SpeakerRegistry，这里只是把它包装成
 * @koishijs/plugin-console 的 DataService，供控制台面板与 schema.dynamic 使用。
 * ChatLuna v2（cordis）下 console 服务不可用，不会注册本类。
 */
export class LunaVitsProvider extends DataService<string> {
    private readonly registry: SpeakerRegistry

    constructor(
        ctx: Context,
        public config: Config
    ) {
        super(ctx, 'luna_vits_data')

        const vits = ctx.get('vits') as LunaVitsService | undefined

        if (!vits?.engine?.registry) {
            throw new Error('vits 服务尚未注册')
        }

        this.registry = vits.engine.registry
    }

    async refresh() {
        await this.registry.refresh()

        this.ctx.schema.set(
            'speaker',
            Schema.union(
                Object.values(this.registry.speakerKeyIdMap).map((s) => s[1])
            )
        )

        await super.refresh(true)
    }

    stop() {
        this.registry.stop()
    }

    // format as markdown table item list [speaker_name, speaker_id]
    async get() {
        const speakers = Object.entries(this.registry.speakerKeyIdMap)
            .map(([k, v]) => [v[1], k])
            .map(([speaker, id]) => `| ${speaker} | ${id} |`)
            .join('\n')

        const usage = await fs.promises.readFile(
            path.resolve(__dirname, '../resources/usage.md'),
            'utf-8'
        )

        return usage.replace('{speakers}', speakers)
    }

    async getVitsConfig() {
        return this.registry.getVitsConfig()
    }

    async getSpeakerKeyIdMap() {
        return this.registry.getSpeakerKeyIdMap()
    }

    async getSpeakerKeyMap() {
        return this.registry.getSpeakerKeyMap()
    }

    static name = 'local-vits-config'

    static inject = {
        console: {
            required: true
        },
        vits: {
            required: true
        }
    } as unknown as string[]
}

declare module '@koishijs/plugin-console' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Console {
        interface Services {
            luna_vits_data: LunaVitsProvider
        }
    }
}
