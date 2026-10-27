import { Context, Element } from 'koishi';
import type { Client } from 'koishi-plugin-gradio-service';
import { GradioSpeaker, VitsConfig } from '../../type';
import { VitsAdapter } from '../base';
export declare class GradioAdapter extends VitsAdapter {
    type: "gradio";
    private clients;
    private processors;
    constructor(ctx: Context);
    predict(input: string, config: VitsConfig<'gradio'>, options: VitsAdapter.Config): Promise<Element>;
    _generatePayload(input: string, client: Client, config: VitsConfig<'gradio'>, currentSpeaker: GradioSpeaker, options: VitsAdapter.Config): Promise<any>;
    getSpeakerList(config: VitsConfig<'gradio'>): Promise<GradioSpeaker[]>;
    getGradioClient(config: VitsConfig<'gradio'>): Promise<Client>;
    private _buildHeaders;
    addProcessor(type: string, processor: GradioProcessor): void;
}
export interface GradioProcessor {
    type: string;
    getSpeakerList: (client: Client, config: VitsConfig<'gradio'>) => Promise<GradioSpeaker[]>;
    generatePayload: (input: string, client: Client, config: VitsConfig<'gradio'>, currentSpeaker: GradioSpeaker, options: VitsAdapter.Config) => Promise<any>;
}
