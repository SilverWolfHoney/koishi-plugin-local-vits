import { Context, h, Session } from 'koishi';
import { Config } from './config';
import Vits from '@initencounter/vits';
import { VitsAdapter } from './adapters/base';
import { VitsConfig } from './type';
import { SpeakerRegistry } from './registry';
/** TTS 失败后的熔断时长：Infinity 表示永久熔断，需手动 `tts 开` 解除 */
export declare const TTS_CIRCUIT_COOLDOWN: number;
export interface TtsStatus {
    manualDisabled: boolean;
    circuitOpenUntil: number;
    lastFailure: {
        time: number;
        message: string;
    } | null;
    cooldown: number;
}
export declare function getTtsStatus(): TtsStatus;
/** 重新开启语音并清除熔断与失败记录 */
export declare function resetTtsCircuit(): void;
/** 临时关闭语音（进程内生效，重启恢复） */
export declare function disableTts(): void;
/**
 * TTS 核心引擎：不依赖 koishi 的服务注册机制，
 * Koishi 4.x（ChatLuna v1）与 ChatLuna v2（cordis）通用。
 */
export declare class LunaVitsEngine {
    ctx: Context;
    config: Config;
    private _adapters;
    /** speaker 注册表：不依赖 console，ChatLuna v2 下同样可用 */
    readonly registry: SpeakerRegistry;
    constructor(ctx: Context, config: Config);
    addAdapter(adapter: VitsAdapter): void;
    predict(input: string, options: VitsAdapter.Config, session?: Session): Promise<h>;
    say(options: Vits.Result): Promise<h>;
    getSpeakerList(config: VitsConfig): any[] | Promise<(import("./type").GPTSoVITS2Speaker | import("./type").VitsSimpleApiSpeaker | import("./type").FishAudioSpeaker | import("./type").QQVoiceSpeaker | import("./type").GradioSpeaker)[]>;
    private checkLanguage;
}
/**
 * Koishi 4.x / ChatLuna v1 的 `vits` 服务包装。
 *
 * ChatLuna v2（cordis）下 koishi 的 Service 注册不可靠，此时不注册本服务，
 * voice handler 直接使用 {@link LunaVitsEngine}。
 */
export declare class LunaVitsService extends Vits {
    engine: LunaVitsEngine;
    constructor(ctx: Context, options: {
        config: Config;
        engine: LunaVitsEngine;
    });
    predict(input: string, options: VitsAdapter.Config, session?: Session): Promise<h>;
    say(options: Vits.Result): Promise<h>;
    getSpeakerList(config: VitsConfig): any[] | Promise<(import("./type").GPTSoVITS2Speaker | import("./type").VitsSimpleApiSpeaker | import("./type").FishAudioSpeaker | import("./type").QQVoiceSpeaker | import("./type").GradioSpeaker)[]>;
}
