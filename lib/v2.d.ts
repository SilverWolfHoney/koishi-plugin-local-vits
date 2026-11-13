import { Context } from 'koishi';
import { Config } from './config';
import { LunaVitsEngine } from './service';
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
export declare function applyChatlunaV2(ctx: Context, config: Config, engine: LunaVitsEngine): void;
