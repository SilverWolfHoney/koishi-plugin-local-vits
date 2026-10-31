import { Context, h, Session } from 'koishi';
import { Config } from './config';
import Vits from '@initencounter/vits';
import { VitsAdapter } from './adapters/base';
import { VitsConfig } from './type';
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
export declare class LunaVitsService extends Vits {
    ctx: Context;
    config: Config;
    private _adapters;
    constructor(ctx: Context, config: Config);
    addAdapter(adapter: VitsAdapter): void;
    predict(input: string, options: VitsAdapter.Config, session?: Session): Promise<h>;
    private checkLanguage;
    say(options: Vits.Result): Promise<h>;
    getSpeakerList(config: VitsConfig): any[] | Promise<(import("./type").GPTSoVITS2Speaker | import("./type").VitsSimpleApiSpeaker | import("./type").FishAudioSpeaker | import("./type").QQVoiceSpeaker | import("./type").GradioSpeaker)[]>;
    static inject: {
        console: {
            required: boolean;
        };
        gradio: {
            required: boolean;
        };
    };
}
