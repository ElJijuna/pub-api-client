import type { PubSearchParams, PubSearchResult } from './domain/Search';
import { PubApiError } from './errors/PubApiError';
import { PackageResource } from './resources/PackageResource';

const DEFAULT_BASE_URL = 'https://pub.dev';

export interface RequestEvent {
  url: string;
  method: 'GET';
  startedAt: Date;
  finishedAt: Date;
  durationMs: number;
  statusCode?: number;
  error?: Error;
}

export interface PubClientEvents {
  request: (event: RequestEvent) => void;
}

export interface PubClientOptions {
  baseUrl?: string;
}

export class PubClient {
  private readonly baseUrl: string;
  private readonly listeners: Map<keyof PubClientEvents, PubClientEvents[keyof PubClientEvents][]> =
    new Map();

  constructor(options: PubClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  on<K extends keyof PubClientEvents>(event: K, callback: PubClientEvents[K]): this {
    const cbs = this.listeners.get(event) ?? [];
    cbs.push(callback);
    this.listeners.set(event, cbs);
    return this;
  }

  private emit<K extends keyof PubClientEvents>(
    event: K,
    payload: Parameters<PubClientEvents[K]>[0],
  ): void {
    const cbs = this.listeners.get(event) ?? [];
    for (const cb of cbs) {
      (cb as (p: typeof payload) => void)(payload);
    }
  }

  /** @internal */
  private async request<T>(path: string, signal?: AbortSignal): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const startedAt = new Date();
    let statusCode: number | undefined;
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal,
      });
      statusCode = response.status;
      if (!response.ok) {
        throw new PubApiError(response.status, response.statusText);
      }
      const data = (await response.json()) as T;
      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt.getTime(),
        statusCode,
      });
      return data;
    } catch (err) {
      const finishedAt = new Date();
      this.emit('request', {
        url,
        method: 'GET',
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        statusCode,
        error: err instanceof Error ? err : new Error(String(err)),
      });
      throw err;
    }
  }

  package(name: string): PackageResource {
    return new PackageResource(name, <T>(path: string, signal?: AbortSignal) =>
      this.request<T>(path, signal),
    );
  }

  async search(params: PubSearchParams, signal?: AbortSignal): Promise<PubSearchResult> {
    const query = buildQuery({ q: params.query, page: params.page });
    return this.request<PubSearchResult>(`/api/search${query}`, signal);
  }
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [
    string,
    string | number,
  ][];
  if (entries.length === 0) {
    return '';
  }
  const search = new URLSearchParams(entries.map(([k, v]) => [k, String(v)]));
  return `?${search.toString()}`;
}
