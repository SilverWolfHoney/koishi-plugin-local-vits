import { VitsAdapter } from './base';
import { Context, h } from 'koishi';
import { VitsConfig, FishAudioSpeaker } from '../type';
export declare class FishAudioAdapter extends VitsAdapter<'fish-audio'> {
    type: "fish-audio";
    constructor(ctx: Context);
    predict(input: string, config: VitsConfig<'fish-audio'>, options: VitsAdapter.Config): Promise<h>;
    private _generatePayload;
    getSpeakerList(config: VitsConfig<'fish-audio'>): Promise<FishAudioSpeaker[]>;
    private _getSpeakerLanguage;
    private _getSpeakerListLanguage;
}
export declare function mappingLanguageToGPTSoVits(lang: string): string;
