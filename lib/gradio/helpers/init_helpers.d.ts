import { Context } from 'koishi';
import { Config } from '../types';
import { GradioClient } from '../client';
export declare function getJwt(ctx: Context, space: string, token: `hf_${string}`, cookies?: string | null): Promise<string | false>;
export declare function determineProtocol(endpoint: string): {
    ws_protocol: 'ws' | 'wss';
    http_protocol: 'http:' | 'https:';
    host: string;
};
export declare const parseAndSetCookies: (cookieHeader: string) => string[];
export declare function getCookieHeader(httpProtocol: string, host: string, auth: [string, string], ctx: Context, hfToken?: `hf_${string}`): Promise<string | null>;
export declare function resolveConfig(this: GradioClient, endpoint: string): Promise<Config | undefined>;
export declare function resolveCookies(this: GradioClient): Promise<void>;
export declare function mapNamesToIds(fns: Config['dependencies']): Record<string, number>;
/**
 * This function is used to resolve the URL for making requests when the app has a root path.
 * The root path could be a path suffix like "/app" which is appended to the end of the base URL. Or
 * it could be a full URL like "https://abidlabs-test-client-replica--gqf2x.hf.space" which is used when hosting
 * Gradio apps on Hugging Face Spaces.
 * @param {string} base_url The base URL at which the Gradio server is hosted
 * @param {string} root_path The root path, which could be a path suffix (e.g. mounted in FastAPI app) or a full URL (e.g. hosted on Hugging Face Spaces)
 * @param {boolean} prioritize_base Whether to prioritize the base URL over the root path. This is used when both the base path and root paths are full URLs. For example, for fetching files the root path should be prioritized, but for making requests, the base URL should be prioritized.
 * @returns {string} the resolved URL
 */
export declare function resolveRoot(baseUrl: string, rootPath: string, prioritizeBase: boolean): string;
