import { Element } from 'koishi';
import { BaseSpeaker, VitsConfig, VitsSimpleApiSpeaker } from '../type';
import { VitsAdapter } from './base';
export declare class VitsSimpleAPIAdapter extends VitsAdapter {
    type: "vits-simple-api";
    predict(input: string, config: VitsConfig<'vits-simple-api'>, options: VitsAdapter.Config): Promise<Element>;
    /** 构建请求头：合并自定义 headers，并支持 api_key / HTTP Basic Auth */
    private _buildHeaders;
    private _generatePayload;
    private _generateVitsPayload;
    private _generateW2V2VitsPayload;
    private _generateBertVits2Payload;
    private _generateGPTSoVitsPayload;
    getSpeakerList(config: VitsConfig): Promise<VitsSimpleApiSpeaker[]>;
    private _fetchSpeakerList;
}
declare module './base' {
    interface Config extends Record<string, string | boolean | number | string[] | BaseSpeaker> {
        segment_size?: number;
        batch_size?: number;
        temperature?: number;
        top_p?: number;
        speed?: number;
        top_k?: number;
        noise?: number;
        noise_w?: number;
        sdp_ratio?: number;
        text_prompt?: string;
        emotion?: number;
    }
}
