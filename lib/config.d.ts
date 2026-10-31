import { Schema } from 'koishi';
export declare const Config: Schema<Schemastery.ObjectS<{
    defaultSpeaker: Schema<any, any>;
    maxLength: Schema<number, number>;
    autoTranslate: Schema<boolean, boolean>;
}> | Schemastery.ObjectS<{
    vitsApi: Schema<Schemastery.ObjectS<{
        enabled: Schema<boolean, boolean>;
        url: Schema<string, string>;
        username: Schema<string, string>;
        password: Schema<string, string>;
        apiKey: Schema<string, string>;
        timeout: Schema<number, number>;
        autoPullSpeaker: Schema<boolean, boolean>;
    }>, Schemastery.ObjectT<{
        enabled: Schema<boolean, boolean>;
        url: Schema<string, string>;
        username: Schema<string, string>;
        password: Schema<string, string>;
        apiKey: Schema<string, string>;
        timeout: Schema<number, number>;
        autoPullSpeaker: Schema<boolean, boolean>;
    }>>;
}>, {
    defaultSpeaker: any;
    maxLength: number;
    autoTranslate: boolean;
} & import("cosmokit").Dict & {
    vitsApi: Schemastery.ObjectT<{
        enabled: Schema<boolean, boolean>;
        url: Schema<string, string>;
        username: Schema<string, string>;
        password: Schema<string, string>;
        apiKey: Schema<string, string>;
        timeout: Schema<number, number>;
        autoPullSpeaker: Schema<boolean, boolean>;
    }>;
}>;
export declare const inject: {
    optional: string[];
};
export interface Config {
    defaultSpeaker: string;
    maxLength: number;
    autoTranslate: boolean;
    vitsApi: {
        enabled: boolean;
        url: string;
        username: string;
        password: string;
        apiKey: string;
        timeout: number;
        autoPullSpeaker: boolean;
    };
}
export declare const name = "local-vits";
