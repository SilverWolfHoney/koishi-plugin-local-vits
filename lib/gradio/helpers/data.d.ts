import { type ApiData, type BlobRef, type Config, type EndpointInfo, type JsApiData, type DataType, Command, type Dependency, type ComponentMeta } from '../types';
export declare function updateObject(object: {
    [x: string]: any;
}, newValue: any, stack: (string | number)[]): void;
export declare function walkAndStoreBlobs(data: DataType, type?: string | undefined, path?: string[], root?: boolean, endpointInfo?: EndpointInfo<ApiData | JsApiData> | undefined): Promise<BlobRef[]>;
export declare function skipQueue(id: number, config: Config): boolean;
export declare function postMessage<Res = any>(message: any, origin: string): Promise<Res>;
export declare function handleFile(file: File | string | Blob | Buffer): FileData | Blob | Command;
/**
 * Handles the payload by filtering out state inputs and returning an array of resolved payload values.
 * We send null values for state inputs to the server, but we don't want to include them in the resolved payload.
 *
 * @param resolvedPayload - The resolved payload values received from the client or the server
 * @param dependency - The dependency object.
 * @param components - The array of component metadata.
 * @param withNullState - Optional. Specifies whether to include null values for state inputs. Default is false.
 * @returns An array of resolved payload values, filtered based on the dependency and component metadata.
 */
export declare function handlePayload(resolvedPayload: unknown[], dependency: Dependency, components: ComponentMeta[], type: 'input' | 'output', withNullState?: boolean): unknown[];
export declare class FileData {
    path: string;
    url?: string;
    orig_name?: string;
    size?: number;
    blob?: File;
    is_stream?: boolean;
    mime_type?: string;
    alt_text?: string;
    readonly meta: {
        _type: string;
    };
    constructor({ path, url, orig_name, size, blob, is_stream, mime_type, alt_text }: {
        path: string;
        url?: string;
        orig_name?: string;
        size?: number;
        blob?: File;
        is_stream?: boolean;
        mime_type?: string;
        alt_text?: string;
    });
}
