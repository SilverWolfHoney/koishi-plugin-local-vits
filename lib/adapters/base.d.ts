import { Context, h, Session } from 'koishi';
import { BaseSpeaker, VitsConfig } from '../type';
export declare abstract class VitsAdapter<T extends 'GPT-SoVITS2' | 'vits-simple-api' | 'gradio' | 'fish-audio' | 'qq-voice' = 'GPT-SoVITS2' | 'vits-simple-api' | 'gradio' | 'fish-audio' | 'qq-voice'> {
    ctx: Context;
    abstract type: T;
    constructor(ctx: Context);
    abstract predict(input: string, config: VitsConfig<T>, options: VitsAdapter.Config, session?: Session): Promise<h>;
    getSpeakerList(config: VitsConfig<T>): Promise<(T extends "GPT-SoVITS2" ? import("../type").GPTSoVITS2Speaker : T extends "vits-simple-api" ? import("../type").VitsSimpleApiSpeaker : T extends "fish-audio" ? import("../type").FishAudioSpeaker : T extends "qq-voice" ? import("../type").QQVoiceSpeaker : import("../type").GradioSpeaker)[]>;
}
export declare namespace VitsAdapter {
    interface Config extends Record<string, string | boolean | number | string[] | BaseSpeaker> {
        speaker: BaseSpeaker | string;
        language?: string;
    }
}
