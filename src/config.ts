import { Schema } from 'koishi'

export const Config = Schema.intersect([
    Schema.object({
        defaultSpeaker:
            Schema.dynamic('speaker').description('全局默认的讲者。'),
        maxLength: Schema.number()
            .description('最大能转换的文字长度。超出后自动报错')
            .min(10)
            .max(500)
            .default(100),
        autoTranslate: Schema.boolean()
            .default(false)
            .description(
                '自动翻译到目标语言（需要翻译服务，并且确保已安装可选依赖`franc-min`)'
            )
    }).description('全局配置'),
    Schema.object({
        vitsApi: Schema.object({
            enabled: Schema.boolean()
                .default(false)
                .description(
                    '开启后可直接在控制台配置 vits-simple-api，无需编辑 data/local-vits/config.yml'
                ),
            url: Schema.string()
                .role('link')
                .description(
                    'vits-simple-api 服务地址，例如 http://127.0.0.1:23456'
                ),
            username: Schema.string().description(
                'HTTP Basic Auth 用户名（后端开启认证时填写）'
            ),
            password: Schema.string()
                .role('secret')
                .description('HTTP Basic Auth 密码'),
            apiKey: Schema.string()
                .role('secret')
                .description('X-API-KEY（后端用 API Key 鉴权时填写）'),
            timeout: Schema.number()
                .default(60000)
                .description('请求超时（毫秒）'),
            autoPullSpeaker: Schema.boolean()
                .default(true)
                .description('自动从后端拉取 speaker 列表')
        }).description('vits-simple-api 快捷配置')
    }).description('后端配置')
])

export const inject = {
    optional: ['translator']
}

export interface Config {
    defaultSpeaker: string
    maxLength: number
    autoTranslate: boolean
    vitsApi: {
        enabled: boolean
        url: string
        username: string
        password: string
        apiKey: string
        timeout: number
        autoPullSpeaker: boolean
    }
}

export const name = 'local-vits'
