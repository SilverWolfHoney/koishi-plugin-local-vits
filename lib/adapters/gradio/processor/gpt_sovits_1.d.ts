import type { Client } from 'koishi-plugin-gradio-service';
import { GradioSpeaker, VitsConfig } from '../../../type';
import { VitsAdapter } from '../../base';
export declare const type = "gpt-sovits-xzjosh";
export declare function getSpeakerList(app: Client, config: VitsConfig<'gradio'>): Promise<{
    fn_index: string | number;
    name: string;
}[]>;
export declare function generatePayload(input: string, client: Client, config: VitsConfig<'gradio'>, speaker: GradioSpeaker, options: VitsAdapter.Config): Promise<((string | number | boolean | string[]) & (string | number | boolean | import("../../../type").BaseSpeaker | string[]))[]>;
