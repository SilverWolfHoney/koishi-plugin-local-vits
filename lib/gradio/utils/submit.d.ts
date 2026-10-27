import type { GradioEvent, SubmitIterable } from '../types';
import { GradioClient } from '../client';
export declare function submit(this: GradioClient, endpoint: string | number, data?: unknown[] | Record<string, unknown>, eventData?: unknown, triggerId?: number | null, allEvents?: boolean): SubmitIterable<GradioEvent>;
