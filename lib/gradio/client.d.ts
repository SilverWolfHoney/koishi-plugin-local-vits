import { Context } from 'koishi';
import { ApiInfo, ClientOptions, Config, GradioEvent, JsApiData, PostResponse, PredictReturn, Status, SubmitIterable } from './types';
export declare class GradioClient {
    ctx: Context;
    appReference: string;
    options: ClientOptions;
    config: Config | undefined;
    apiInfo: ApiInfo<JsApiData> | undefined;
    apiMap: Record<string, number>;
    session_hash: string;
    jwt: string | false;
    lastStatus: Record<string, Status['stage']>;
    private cookies;
    private resolveConfig;
    private resolveCookie;
    private viewApi;
    openStream: () => Promise<void>;
    postData: (url: string, data: unknown, headers?: Headers) => Promise<[PostResponse, number]>;
    submit: (endpoint: string | number, data: unknown[] | Record<string, unknown> | undefined, event_data?: unknown, trigger_id?: number | null, all_events?: boolean) => SubmitIterable<GradioEvent>;
    predict: (endpoint: string | number, data: unknown[] | Record<string, unknown> | undefined, event_data?: unknown) => Promise<PredictReturn>;
    streamStatus: {
        open: boolean;
    };
    pendingStreamMessages: Record<string, any[][]>;
    pendingDiffStreams: Record<string, any[][]>;
    eventCallbacks: Record<string, (data?: unknown) => Promise<void>>;
    unclosedEvents: Set<string>;
    abortController: AbortController | null;
    streamInstance: EventSource | null;
    constructor(ctx: Context, appReference: string, options?: ClientOptions);
    init(): Promise<void>;
    private _resolveConfig;
    private _configSuccess;
    stream(url: URL): EventSource;
    private prepareReturnObj;
    setCookies(cookies: string): void;
    static connect(ctx: Context, url: string, options?: ClientOptions): Promise<GradioClient>;
    close(): void;
}
