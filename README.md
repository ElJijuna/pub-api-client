# pub-api-client

<p align="center">
  <img src="https://pub.dev/static/hash-oqf6qf9g/img/pub-dev-logo.svg" alt="pub.dev logo" width="200" />
</p>

[![npm version](https://img.shields.io/npm/v/pub-api-client)](https://www.npmjs.com/package/pub-api-client)
[![npm downloads](https://img.shields.io/npm/dm/pub-api-client)](https://www.npmjs.com/package/pub-api-client)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/pub-api-client)](https://bundlephobia.com/package/pub-api-client)
[![CI](https://github.com/ElJijuna/pub-api-client/actions/workflows/ci.yml/badge.svg)](https://github.com/ElJijuna/pub-api-client/actions/workflows/ci.yml)
[![semantic-release: angular](https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release)](https://github.com/semantic-release/semantic-release)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/node/v/pub-api-client)](https://nodejs.org/)

TypeScript client for the [pub.dev](https://pub.dev) REST API. Covers package metadata, version listings, scores, and search. Works in **Node.js** and the **browser** (isomorphic). Fully typed, zero runtime dependencies.

**Data source:**

| Source | What it provides |
| --- | --- |
| [pub.dev](https://pub.dev) | Dart and Flutter package metadata, versions, scores, and search |

---

## Installation

```bash
npm install pub-api-client
```

---

## Quick start

```typescript
import { PubClient } from 'pub-api-client';

// Public API — no auth required
const client = new PubClient();

// Custom base URL (e.g. a self-hosted instance)
const custom = new PubClient({
  baseUrl: 'https://my-pub.example.com',
});
```

---

## API reference

### Package

```typescript
// Full package info (latest + all versions)
const info = await client.package('flutter').info();
console.log(info.name);           // 'flutter'
console.log(info.latest.version); // '3.7.0'
console.log(info.versions.length); // total number of versions

// All published versions
const versions = await client.package('riverpod').versions();
console.log(versions[0].version); // '0.1.0'
console.log(versions[0].published); // '2020-10-20T...'

// Specific version metadata
const v = await client.package('riverpod').version('2.0.0');
console.log(v.version);    // '2.0.0'
console.log(v.archiveUrl); // 'https://pub.dev/packages/riverpod/versions/2.0.0.tar.gz'
console.log(v.published);  // '2022-09-14T...'

// Latest version
const latest = await client.package('riverpod').latest();
console.log(latest.version);        // e.g. '2.6.1'
console.log(latest.pubspec.name);   // 'riverpod'
```

### Search

```typescript
const results = await client.search({ query: 'state management', page: 1 });

console.log(results.packages.length); // results on this page
results.packages.forEach(pkg => {
  console.log(pkg.package); // 'riverpod', 'bloc', ...
});

// Next page
if (results.next) {
  const page2 = await client.search({ query: 'state management', page: 2 });
}
```

| Parameter | Type | Description |
| --- | --- | --- |
| `query` | `string` | Search text (optional — omit for all packages) |
| `page` | `number` | Page number for pagination (1-based) |

### Package score

```typescript
const score = await client.package('flutter').score();
console.log(score.grantedPoints);  // 130
console.log(score.maxPoints);      // 140
console.log(score.likeCount);      // number of likes
console.log(score.popularityScore); // 0.0 – 1.0
console.log(score.lastUpdated);    // ISO date string
```

---

## Cancelling requests

Pass an `AbortSignal` to any method to cancel the in-flight request:

```typescript
const controller = new AbortController();
setTimeout(() => controller.abort(), 5000);

await client.package('flutter').info(controller.signal);
await client.package('flutter').versions(controller.signal);
await client.package('flutter').version('3.7.0', controller.signal);
await client.package('flutter').latest(controller.signal);
await client.package('flutter').score(controller.signal);
await client.search({ query: 'riverpod' }, controller.signal);
```

When aborted, `fetch` throws a `DOMException` with `name === 'AbortError'`. The `request` event is still emitted with the error attached.

---

## Request events

Subscribe to every HTTP request for logging, monitoring, or debugging:

```typescript
client.on('request', (event) => {
  console.log(`[${event.statusCode}] ${event.method} ${event.url} (${event.durationMs}ms)`);
  if (event.error) {
    console.error('Request failed:', event.error.message);
  }
});
```

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string` | Full URL requested |
| `method` | `'GET'` | HTTP method |
| `startedAt` | `Date` | When the request started |
| `finishedAt` | `Date` | When the request finished |
| `durationMs` | `number` | Duration in milliseconds |
| `statusCode` | `number \| undefined` | HTTP status code, if a response was received |
| `error` | `Error \| undefined` | Present only if the request failed |

`on()` is chainable and supports multiple listeners:

```typescript
client
  .on('request', logToConsole)
  .on('request', sendToDatadog);
```

---

## Error handling

Non-2xx responses throw a `PubApiError`:

```typescript
import { PubApiError } from 'pub-api-client';

try {
  await client.package('nonexistent-package-xyz').info();
} catch (err) {
  if (err instanceof PubApiError) {
    console.log(err.status);     // 404
    console.log(err.statusText); // 'Not Found'
    console.log(err.message);    // 'Pub API error: 404 Not Found'
  }
}
```

---

## TypeScript types

All domain types are exported:

```typescript
import type {
  // Client
  PubClientOptions,
  RequestEvent,
  PubClientEvents,

  // Search
  PubSearchParams,
  PubSearchResult,
  PubSearchPackage,

  // Package
  PubPackageInfo,
  PubVersionInfo,
  PubPubspec,
  PubPackageScore,
} from 'pub-api-client';
```

---

## License

[MIT](LICENSE)
