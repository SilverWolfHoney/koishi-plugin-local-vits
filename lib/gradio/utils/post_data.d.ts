import { GradioClient } from '../client';
import type { PostResponse } from '../types';
export declare function postData(this: GradioClient, url: string, body: unknown, additionalHeaders?: any): Promise<[PostResponse, number]>;
