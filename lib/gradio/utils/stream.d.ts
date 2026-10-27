import { Context } from 'koishi';
import { GradioClient } from '../client';
export declare function openStream(this: GradioClient): Promise<void>;
export declare function closeStream(streamStatus: {
    open: boolean;
}, abortController: AbortController | null): void;
export declare function applyDiffStream(pendingDiffStreams: Record<string, any[][]>, eventId: string, data: any): void;
export declare function applyDiff(obj: any, diff: [string, (number | string)[], any][]): any;
export declare function readableStream(ctx: Context, input: string, init?: RequestInit): EventSource;
