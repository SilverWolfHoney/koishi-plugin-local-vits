import { FishAudioSpeaker, GradioSpeaker, QQVoiceSpeaker, Speaker, VitsConfig, VitsSimpleApiSpeaker } from './type';
import { DataService } from '@koishijs/plugin-console';
import { Awaitable, Context } from 'koishi';
import { PromiseLock } from './utils';
export declare class LunaVitsProvider extends DataService<string> {
    private vitsConfig;
    private speakerKeyIdMap;
    private speakerKeyMap;
    private abortController;
    lock: PromiseLock;
    constructor(ctx: Context);
    refresh(): Promise<void>;
    stop(): Awaitable<void>;
    loadConfig(): Promise<VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">[]>;
    resolveConfigDir(): string;
    resolveConfigPath(): string;
    watchConfig(): void;
    processSpeaker(speaker: Speaker, config: VitsConfig, result: [VitsConfig, string, Speaker][]): void;
    mapSpeakers(): Record<number, [VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, string, import("./type").GPTSoVITS2Speaker | VitsSimpleApiSpeaker | FishAudioSpeaker | QQVoiceSpeaker | GradioSpeaker]>;
    mapSpeakerKey(): {
        [k: string]: [VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, import("./type").GPTSoVITS2Speaker | VitsSimpleApiSpeaker | FishAudioSpeaker | QQVoiceSpeaker | GradioSpeaker];
    };
    get(): Promise<string>;
    getVitsConfig(): Promise<VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">[]>;
    getSpeakerKeyIdMap(): Promise<Record<number, [VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, string, import("./type").GPTSoVITS2Speaker | VitsSimpleApiSpeaker | FishAudioSpeaker | QQVoiceSpeaker | GradioSpeaker]>>;
    getSpeakerKeyMap(): Promise<Record<string, [VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, import("./type").GPTSoVITS2Speaker | VitsSimpleApiSpeaker | FishAudioSpeaker | QQVoiceSpeaker | GradioSpeaker]>>;
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
