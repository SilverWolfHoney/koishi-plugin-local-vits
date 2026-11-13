import { Context } from 'koishi';
import { DataService } from '@koishijs/plugin-console';
import { Config } from './config';
/**
 * 控制台数据服务（仅 Koishi 4.x / ChatLuna v1 的 console 可用时注册）。
 *
 * speaker 的加载/映射逻辑已抽到 SpeakerRegistry，这里只是把它包装成
 * @koishijs/plugin-console 的 DataService，供控制台面板与 schema.dynamic 使用。
 * ChatLuna v2（cordis）下 console 服务不可用，不会注册本类。
 */
export declare class LunaVitsProvider extends DataService<string> {
    config: Config;
    private readonly registry;
    constructor(ctx: Context, config: Config);
    refresh(): Promise<void>;
    stop(): void;
    get(): Promise<string>;
    getVitsConfig(): Promise<import("./type").VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">[]>;
    getSpeakerKeyIdMap(): Promise<Record<number, [import("./type").VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, string, import("./type").GPTSoVITS2Speaker | import("./type").VitsSimpleApiSpeaker | import("./type").FishAudioSpeaker | import("./type").QQVoiceSpeaker | import("./type").GradioSpeaker]>>;
    getSpeakerKeyMap(): Promise<Record<string, [import("./type").VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, import("./type").GPTSoVITS2Speaker | import("./type").VitsSimpleApiSpeaker | import("./type").FishAudioSpeaker | import("./type").QQVoiceSpeaker | import("./type").GradioSpeaker]>>;
    static name: string;
    static inject: string[];
}
declare module '@koishijs/plugin-console' {
    namespace Console {
        interface Services {
            luna_vits_data: LunaVitsProvider;
        }
    }
}
