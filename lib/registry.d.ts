import { Context } from 'koishi';
import { Config } from './config';
import { FishAudioSpeaker, GradioSpeaker, QQVoiceSpeaker, Speaker, VitsConfig, VitsSimpleApiSpeaker } from './type';
/**
 * speaker 注册表：从 data/local-vits/config.yml 读取后端配置，拉取 speaker 列表，
 * 并维护 speaker 名 -> (配置, speaker) 的映射。
 *
 * 该逻辑原本依赖 @koishijs/plugin-console 的 DataService；ChatLuna v2（cordis）
 * 下 console 服务不可用，因此抽成独立类，v1 控制台与 v2 voice handler 共用。
 */
export declare class SpeakerRegistry {
    ctx: Context;
    config: Config;
    private getSpeakerList;
    vitsConfig: VitsConfig[];
    speakerKeyIdMap: Record<number, [VitsConfig, string, Speaker]>;
    speakerKeyMap: Record<string, [VitsConfig, Speaker]>;
    private readonly lock;
    private abortController;
    constructor(ctx: Context, config: Config, getSpeakerList: (config: VitsConfig) => Speaker[] | Promise<Speaker[]>);
    resolveConfigDir(): string;
    resolveConfigPath(): string;
    refresh(): Promise<void>;
    loadConfig(): Promise<VitsConfig[]>;
    /** 从控制台插件配置构造一个 vits-simple-api 后端（启用时） */
    private buildManagedConfig;
    watchConfig(): void;
    processSpeaker(speaker: Speaker, config: VitsConfig, result: [VitsConfig, string, Speaker][]): void;
    mapSpeakers(): Record<number, [VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, string, import("./type").GPTSoVITS2Speaker | VitsSimpleApiSpeaker | FishAudioSpeaker | QQVoiceSpeaker | GradioSpeaker]>;
    mapSpeakerKey(): {
        [k: string]: [VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, import("./type").GPTSoVITS2Speaker | VitsSimpleApiSpeaker | FishAudioSpeaker | QQVoiceSpeaker | GradioSpeaker];
    };
    stop(): void;
    getSpeakerKeyMap(): Record<string, [VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, import("./type").GPTSoVITS2Speaker | VitsSimpleApiSpeaker | FishAudioSpeaker | QQVoiceSpeaker | GradioSpeaker]>;
    getSpeakerKeyIdMap(): Record<number, [VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, string, import("./type").GPTSoVITS2Speaker | VitsSimpleApiSpeaker | FishAudioSpeaker | QQVoiceSpeaker | GradioSpeaker]>;
    getVitsConfig(): VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">[];
}
