import { Schema } from 'koishi';
export declare const Config: Schema<Schemastery.ObjectS<{
    defaultSpeaker: Schema<any, any>;
    maxLength: Schema<number, number>;
    autoTranslate: Schema<boolean, boolean>;
}>, {
    defaultSpeaker: any;
    maxLength: number;
    autoTranslate: boolean;
} & import("cosmokit").Dict>;
export declare const inject: {
    optional: string[];
};
export interface Config {
    defaultSpeaker: string;
    maxLength: number;
    autoTranslate: boolean;
}
export declare const name = "local-vits";
