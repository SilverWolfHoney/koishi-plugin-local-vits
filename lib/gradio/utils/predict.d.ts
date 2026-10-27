import { GradioClient } from '../client';
import type { PredictReturn } from '../types';
export declare function predict(this: GradioClient, endpoint: string | number, data?: unknown[] | Record<string, unknown>): Promise<PredictReturn>;
