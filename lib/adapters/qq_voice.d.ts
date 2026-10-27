import { VitsAdapter } from './base';
import { Context, h, Session } from 'koishi';
import { QQVoiceSpeaker, VitsConfig } from '../type';
export declare class QQVoiceAdapter extends VitsAdapter {
    type: "qq-voice";
    private static _accounts;
    private static _lock;
    constructor(ctx: Context);
    predict(input: string, _: VitsConfig, options: VitsAdapter.Config, session: Session): Promise<h>;
    getSpeakerList(config: VitsConfig<'qq-voice'>): Promise<QQVoiceSpeaker[]>;
}
