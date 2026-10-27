import { Context, h, Session } from 'koishi';
import { Config } from './config';
import Vits from '@initencounter/vits';
import { VitsAdapter } from './adapters/base';
import { VitsConfig } from './type';
export declare class LunaVitsService extends Vits {
    ctx: Context;
    config: Config;
    private _adapters;
    constructor(ctx: Context, config: Config);
    addAdapter(adapter: VitsAdapter): void;
    predict(input: string, options: VitsAdapter.Config, session?: Session): Promise<h>;
    private checkLanguage;
    say(options: Vits.Result): Promise<h>;
    getSpeakerList(config: VitsConfig): Promise<(import("./type").GPTSoVITS2Speaker | import("./type").VitsSimpleApiSpeaker | import("./type").FishAudioSpeaker | import("./type").QQVoiceSpeaker | import("./type").GradioSpeaker)[]>;
    static inject: {
        console: {
            required: boolean;
        };
        gradio: {
            required: boolean;
        };
    };
}
