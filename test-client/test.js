import { PubClient } from '../dist/index.js';

const client = new PubClient();

client.on('request', (e) => {
  const status = e.error ? `ERROR ${e.error.message}` : e.statusCode;
  console.log(`  [${status}] ${e.method} ${e.url} (${e.durationMs}ms)`);
});

async function test() {
  // --- PackageResource ---

  // Package info
  const info = await client.package('flutter').info();
  console.log('flutter package name:', info.name);
  console.log('flutter latest version:', info.latest.version);
  console.log('flutter total versions:', info.versions.length);

  // All versions
  const versions = await client.package('riverpod').versions();
  console.log('\nriverpod versions count:', versions.length);
  console.log(
    'Last 3 versions:',
    versions
      .slice(-3)
      .map((v) => v.version)
      .join(', '),
  );

  // Specific version
  const v = await client.package('riverpod').version('2.0.0');
  console.log('\nriverpod 2.0.0 published:', v.published);
  console.log('riverpod 2.0.0 archive:', v.archiveUrl);

  // Latest version
  const latest = await client.package('riverpod').latest();
  console.log('\nriverpod latest version:', latest.version);
  console.log('riverpod latest published:', latest.published);

  // Package score
  const score = await client.package('flutter').score();
  console.log('\nflutter score:', `${score.grantedPoints}/${score.maxPoints}`);
  console.log('flutter likes:', score.likeCount);
  console.log('flutter popularity:', score.popularityScore);

  // --- Search ---

  const results = await client.search({ query: 'state management', page: 1 });
  console.log(`\nSearch "state management" — ${results.packages.length} packages on page 1:`);
  for (const pkg of results.packages.slice(0, 5)) {
    console.log(` - ${pkg.package}`);
  }
  if (results.next) {
    console.log('  Next page:', results.next);
  }

  // Search with no query
  const all = await client.search({});
  console.log(`\nSearch (no query) — first package: ${all.packages[0]?.package ?? 'none'}`);
}

try {
  await test();
} catch (err) {
  console.error(err);
  process.exit(1);
}
