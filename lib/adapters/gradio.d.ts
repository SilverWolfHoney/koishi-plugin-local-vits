import { Element } from 'koishi';
import { GradioSpeaker, VitsConfig } from '../type';
import { VitsAdapter } from './base';
import type { Client } from 'koishi-plugin-gradio-service';
export declare class GradioAdapter extends VitsAdapter {
    type: string;
    private clients;
    predict(input: string, config: VitsConfig<'gradio'>, options: VitsAdapter.Config): Promise<Element>;
    _generatePayload(input: string, client: Client, config: VitsConfig<'gradio'>, currentSpeaker: GradioSpeaker, options: VitsAdapter.Config): Promise<((string | number | boolean | string[]) & (string | number | boolean | import("../type").BaseSpeaker | string[]))[]>;
    _generateBertVits2Payload(input: string, client: Client, speaker: GradioSpeaker, options: VitsAdapter.Config): Promise<((string | number | boolean | string[]) & (string | number | boolean | import("../type").BaseSpeaker | string[]))[]>;
    getSpeakerList(config: VitsConfig<'gradio'>): Promise<{
        name: string;
        fn_index: string | number;
    }[]>;
    getBertVits2SpeakerList(config: VitsConfig<'gradio'>): Promise<{
        name: string;
        fn_index: string | number;
    }[]>;
    getGradioClient(config: VitsConfig<'gradio'>): Promise<Client>;
}
