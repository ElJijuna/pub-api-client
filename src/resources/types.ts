export type RequestFn = <T>(path: string, signal?: AbortSignal) => Promise<T>;
