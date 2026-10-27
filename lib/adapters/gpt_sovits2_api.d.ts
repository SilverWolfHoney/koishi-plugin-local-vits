import { VitsAdapter } from './base';
import { Context, h } from 'koishi';
import { VitsConfig } from '../type';
export declare class GPTSoVITS2Adapter extends VitsAdapter {
    type: "GPT-SoVITS2";
    private _configWeights;
    constructor(ctx: Context);
    predict(input: string, config: VitsConfig<'GPT-SoVITS2'>, options: VitsAdapter.Config): Promise<h>;
    private _updateSovitsWeights;
    private _updateGPTWeights;
    private _generatePayload;
}
export declare function mappingLanguageToGPTSoVits(lang: string): string;
