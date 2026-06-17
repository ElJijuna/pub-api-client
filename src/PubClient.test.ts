import { PackageResource, PubApiError, PubClient } from './index';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockResponse<T>(data: T, status = 200): void {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Not Found',
    json: () => Promise.resolve(data),
  });
}

function mockError(status: number): void {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status,
    statusText: 'Not Found',
    json: jest.fn(),
  });
}

// --- Fixtures ---

const searchFixture = {
  packages: [{ package: 'flutter' }, { package: 'riverpod' }],
  next: 'https://pub.dev/api/search?q=state&page=2',
};

const versionInfo = {
  version: '3.7.0',
  pubspec: { name: 'flutter', version: '3.7.0', description: 'Flutter SDK' },
  archiveUrl: 'https://pub.dev/packages/flutter/versions/3.7.0.tar.gz',
  archiveSha256: 'abc123',
  published: '2023-02-01T00:00:00.000Z',
};

const olderVersionInfo = {
  version: '3.6.0',
  pubspec: { name: 'flutter', version: '3.6.0' },
  archiveUrl: 'https://pub.dev/packages/flutter/versions/3.6.0.tar.gz',
  archiveSha256: 'def456',
  published: '2022-12-01T00:00:00.000Z',
};

const packageFixture = {
  name: 'flutter',
  latest: versionInfo,
  versions: [olderVersionInfo, versionInfo],
};

const scoreFixture = {
  grantedPoints: 130,
  maxPoints: 140,
  likeCount: 1234,
  popularityScore: 0.99,
  lastUpdated: '2023-02-01T00:00:00.000Z',
};

// --- Tests ---

describe('PubApiError', () => {
  it('is an instance of Error', () => {
    expect(new PubApiError(404, 'Not Found')).toBeInstanceOf(Error);
  });

  it('is an instance of PubApiError', () => {
    expect(new PubApiError(404, 'Not Found')).toBeInstanceOf(PubApiError);
  });

  it('has the correct name', () => {
    expect(new PubApiError(404, 'Not Found').name).toBe('PubApiError');
  });

  it('exposes status and statusText', () => {
    const err = new PubApiError(404, 'Not Found');
    expect(err.status).toBe(404);
    expect(err.statusText).toBe('Not Found');
  });

  it('message includes status and statusText', () => {
    const err = new PubApiError(404, 'Not Found');
    expect(err.message).toContain('404');
    expect(err.message).toContain('Not Found');
  });

  it('can be caught as Error', () => {
    expect(() => {
      throw new PubApiError(500, 'Internal Server Error');
    }).toThrow(Error);
  });

  it('instanceof works after being thrown and caught', () => {
    let caught: unknown;
    try {
      throw new PubApiError(403, 'Forbidden');
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(PubApiError);
    expect(caught).toBeInstanceOf(Error);
  });
});

describe('PubClient', () => {
  let client: PubClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new PubClient();
  });

  describe('constructor', () => {
    it('constructs with defaults', () => {
      expect(new PubClient()).toBeInstanceOf(PubClient);
    });

    it('accepts custom baseUrl', () => {
      expect(new PubClient({ baseUrl: 'https://my-pub.example.com' })).toBeInstanceOf(PubClient);
    });

    it('uses https://pub.dev as default base URL', async () => {
      mockResponse(searchFixture);
      await client.search({});
      expect(mockFetch.mock.calls[0][0] as string).toMatch(/^https:\/\/pub\.dev\//);
    });

    it('uses custom baseUrl for requests', async () => {
      const custom = new PubClient({ baseUrl: 'https://my-pub.example.com' });
      mockResponse(searchFixture);
      await custom.search({});
      expect(mockFetch.mock.calls[0][0] as string).toMatch(/^https:\/\/my-pub\.example\.com\//);
    });

    it('strips trailing slash from baseUrl', async () => {
      const slashed = new PubClient({ baseUrl: 'https://pub.dev/' });
      mockResponse(searchFixture);
      await slashed.search({});
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toMatch(/^https:\/\/pub\.dev\/api\/search/);
      expect(url).not.toContain('//api');
    });
  });

  describe('search()', () => {
    it('calls /api/search', async () => {
      mockResponse(searchFixture);
      await client.search({});
      expect(mockFetch.mock.calls[0][0] as string).toContain('/api/search');
    });

    it('includes q param when query provided', async () => {
      mockResponse(searchFixture);
      await client.search({ query: 'riverpod' });
      expect(mockFetch.mock.calls[0][0] as string).toContain('q=riverpod');
    });

    it('includes page param when provided', async () => {
      mockResponse(searchFixture);
      await client.search({ query: 'flutter', page: 2 });
      expect(mockFetch.mock.calls[0][0] as string).toContain('page=2');
    });

    it('omits page param when not provided', async () => {
      mockResponse(searchFixture);
      await client.search({ query: 'flutter' });
      expect(mockFetch.mock.calls[0][0] as string).not.toContain('page=');
    });

    it('omits q param when query not provided', async () => {
      mockResponse(searchFixture);
      await client.search({});
      expect(mockFetch.mock.calls[0][0] as string).not.toContain('q=');
    });

    it('returns full search result', async () => {
      mockResponse(searchFixture);
      const result = await client.search({ query: 'flutter' });
      expect(result.packages).toHaveLength(2);
      expect(result.packages[0].package).toBe('flutter');
      expect(result.next).toContain('page=2');
    });

    it('sends Accept: application/json header', async () => {
      mockResponse(searchFixture);
      await client.search({});
      const headers = mockFetch.mock.calls[0][1].headers as Record<string, string>;
      expect(headers.Accept).toBe('application/json');
    });

    it('throws PubApiError on non-2xx', async () => {
      mockError(500);
      await expect(client.search({ query: 'flutter' })).rejects.toThrow(PubApiError);
    });

    it('passes signal to fetch', async () => {
      mockResponse(searchFixture);
      const controller = new AbortController();
      await client.search({ query: 'flutter' }, controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('on() event emitter', () => {
    it('emits request event on success', async () => {
      mockResponse(searchFixture);
      const events: unknown[] = [];
      client.on('request', (e) => events.push(e));
      await client.search({});
      expect(events).toHaveLength(1);
      const event = events[0] as { method: string; statusCode: number };
      expect(event.method).toBe('GET');
      expect(event.statusCode).toBe(200);
    });

    it('emits request event with error on failure', async () => {
      mockError(404);
      const events: unknown[] = [];
      client.on('request', (e) => events.push(e));
      await expect(client.search({ query: 'nonexistent' })).rejects.toThrow(PubApiError);
      expect((events[0] as { error: Error }).error).toBeInstanceOf(PubApiError);
    });

    it('supports method chaining', () => {
      expect(client.on('request', () => undefined)).toBe(client);
    });

    it('calls multiple listeners in registration order', async () => {
      mockResponse(searchFixture);
      const calls: number[] = [];
      client
        .on('request', () => calls.push(1))
        .on('request', () => calls.push(2))
        .on('request', () => calls.push(3));
      await client.search({});
      expect(calls).toEqual([1, 2, 3]);
    });

    it('event includes url, startedAt, finishedAt, durationMs', async () => {
      mockResponse(searchFixture);
      const events: unknown[] = [];
      client.on('request', (e) => events.push(e));
      await client.search({});
      const e = events[0] as { url: string; startedAt: Date; finishedAt: Date; durationMs: number };
      expect(typeof e.url).toBe('string');
      expect(e.startedAt).toBeInstanceOf(Date);
      expect(e.finishedAt).toBeInstanceOf(Date);
      expect(typeof e.durationMs).toBe('number');
    });

    it('propagates AbortError and emits request event', async () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      mockFetch.mockRejectedValueOnce(abortError);
      const events: unknown[] = [];
      client.on('request', (e) => events.push(e));
      await expect(
        client.search({ query: 'flutter' }, new AbortController().signal),
      ).rejects.toThrow('The operation was aborted.');
      expect(events).toHaveLength(1);
      expect((events[0] as { error: Error }).error.message).toContain('The operation was aborted.');
    });
  });

  describe('package()', () => {
    it('returns a PackageResource instance', () => {
      expect(client.package('flutter')).toBeInstanceOf(PackageResource);
    });

    it('returns a resource with the expected methods', () => {
      const resource = client.package('flutter');
      expect(typeof resource.info).toBe('function');
      expect(typeof resource.versions).toBe('function');
      expect(typeof resource.version).toBe('function');
      expect(typeof resource.latest).toBe('function');
      expect(typeof resource.score).toBe('function');
    });
  });
});

describe('PackageResource', () => {
  let client: PubClient;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new PubClient();
  });

  describe('info()', () => {
    it('calls GET /api/packages/{name}', async () => {
      mockResponse(packageFixture);
      await client.package('flutter').info();
      expect(mockFetch.mock.calls[0][0] as string).toContain('/api/packages/flutter');
    });

    it('returns the full package info', async () => {
      mockResponse(packageFixture);
      const info = await client.package('flutter').info();
      expect(info.name).toBe('flutter');
      expect(info.latest.version).toBe('3.7.0');
      expect(info.versions).toHaveLength(2);
    });

    it('throws PubApiError on 404', async () => {
      mockError(404);
      await expect(client.package('nonexistent').info()).rejects.toThrow(PubApiError);
    });

    it('passes AbortSignal to fetch', async () => {
      mockResponse(packageFixture);
      const controller = new AbortController();
      await client.package('flutter').info(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('versions()', () => {
    it('calls GET /api/packages/{name}', async () => {
      mockResponse(packageFixture);
      await client.package('flutter').versions();
      expect(mockFetch.mock.calls[0][0] as string).toContain('/api/packages/flutter');
    });

    it('returns the versions array', async () => {
      mockResponse(packageFixture);
      const versions = await client.package('flutter').versions();
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe('3.6.0');
      expect(versions[1].version).toBe('3.7.0');
    });

    it('throws PubApiError on 404', async () => {
      mockError(404);
      await expect(client.package('nonexistent').versions()).rejects.toThrow(PubApiError);
    });

    it('passes AbortSignal to fetch', async () => {
      mockResponse(packageFixture);
      const controller = new AbortController();
      await client.package('flutter').versions(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('version(v)', () => {
    it('calls GET /api/packages/{name}/versions/{v}', async () => {
      mockResponse(versionInfo);
      await client.package('flutter').version('3.7.0');
      expect(mockFetch.mock.calls[0][0] as string).toContain(
        '/api/packages/flutter/versions/3.7.0',
      );
    });

    it('returns the version info', async () => {
      mockResponse(versionInfo);
      const v = await client.package('flutter').version('3.7.0');
      expect(v.version).toBe('3.7.0');
      expect(v.pubspec.name).toBe('flutter');
      expect(v.published).toBe('2023-02-01T00:00:00.000Z');
    });

    it('throws PubApiError on 404', async () => {
      mockError(404);
      await expect(client.package('flutter').version('0.0.0')).rejects.toThrow(PubApiError);
    });

    it('passes AbortSignal to fetch', async () => {
      mockResponse(versionInfo);
      const controller = new AbortController();
      await client.package('flutter').version('3.7.0', controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('latest()', () => {
    it('calls GET /api/packages/{name} (not /versions)', async () => {
      mockResponse(packageFixture);
      await client.package('flutter').latest();
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('/api/packages/flutter');
      expect(url).not.toContain('/versions');
    });

    it('returns the latest version info', async () => {
      mockResponse(packageFixture);
      const latest = await client.package('flutter').latest();
      expect(latest.version).toBe('3.7.0');
      expect(latest.pubspec.name).toBe('flutter');
    });

    it('throws PubApiError on 404', async () => {
      mockError(404);
      await expect(client.package('nonexistent').latest()).rejects.toThrow(PubApiError);
    });

    it('passes AbortSignal to fetch', async () => {
      mockResponse(packageFixture);
      const controller = new AbortController();
      await client.package('flutter').latest(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });

  describe('score()', () => {
    it('calls GET /api/packages/{name}/score', async () => {
      mockResponse(scoreFixture);
      await client.package('flutter').score();
      expect(mockFetch.mock.calls[0][0] as string).toContain('/api/packages/flutter/score');
    });

    it('returns the score data', async () => {
      mockResponse(scoreFixture);
      const s = await client.package('flutter').score();
      expect(s.grantedPoints).toBe(130);
      expect(s.maxPoints).toBe(140);
      expect(s.likeCount).toBe(1234);
      expect(s.popularityScore).toBe(0.99);
    });

    it('throws PubApiError on 404', async () => {
      mockError(404);
      await expect(client.package('nonexistent').score()).rejects.toThrow(PubApiError);
    });

    it('passes AbortSignal to fetch', async () => {
      mockResponse(scoreFixture);
      const controller = new AbortController();
      await client.package('flutter').score(controller.signal);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });
  });
});
