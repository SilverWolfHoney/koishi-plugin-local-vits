import { Context } from 'koishi';
export declare function removeProperty<T extends object, K extends keyof T>(value: T, properties: K[]): Omit<T, K>;
export declare function selectProperty<T extends object, K extends keyof T>(value: T, properties: K[]): Pick<T, K>;
export declare class PromiseLock {
    private _lock;
    constructor(lock?: boolean);
    lock(): Promise<void>;
    runLocked<T>(callback: () => Promise<T> | T): Promise<T>;
    unlock(): void;
}
export declare class TTLCache<T> {
    private _ttlTime;
    private _cache;
    constructor(ctx: Context, _ttlTime?: number);
    get(key: string): T;
    set(key: string, value: T): void;
    delete(key: string): void;
    clear(): void;
}
export declare function getAudioFileExtension(filePath: string): "audio/wav" | "audio/mp3" | "audio/flac" | "audio/slik";
export declare function getSpeaker(ctx: Context, speakerKeyMap: Awaited<ReturnType<typeof ctx.console.services.luna_vits_data.getSpeakerKeyMap>>, speaker: string): (string | [import("./type").VitsConfig<"GPT-SoVITS2" | "vits-simple-api" | "gradio" | "fish-audio" | "qq-voice">, import("./type").GPTSoVITS2Speaker | import("./type").VitsSimpleApiSpeaker | import("./type").FishAudioSpeaker | import("./type").QQVoiceSpeaker | import("./type").GradioSpeaker])[];
export declare function isNumeric(str: string): boolean;
