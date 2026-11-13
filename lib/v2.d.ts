import { Context } from 'koishi';
import { Config } from './config';
import { LunaVitsEngine } from './service';
/**
 * ChatLuna v2（cordis 架构）适配。
 *
 * v2 的语音链路走 `@chatluna/chat-voice` 的 `voice` 服务：模型输出
 * `<voice>` 元素时由 handler 链渲染。这里注册一个 handler，把文本交给
 * local-vits 引擎合成；失败时降级给后续 handler（例如 @speak 模型）或纯文本。
 *
 * Koishi 4.x / ChatLuna v1 没有 `voice` 服务，`ctx.inject(['voice'])`
 * 不会触发，对旧环境无副作用。
 */
export declare function applyChatlunaV2(ctx: Context, config: Config, engine: LunaVitsEngine): void;
