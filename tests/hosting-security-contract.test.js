import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Vercel and fallback Apache apply the same baseline browser security headers', async () => {
  const [apache, vercelSource] = await Promise.all([
    readFile(new URL('../.htaccess', import.meta.url), 'utf8'),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  ]);
  const vercel = JSON.parse(vercelSource);
  const configuredHeaders = new Map(
    vercel.headers?.find((entry) => entry.source === '/(.*)')?.headers
      ?.map(({ key, value }) => [key, value]) ?? [],
  );
  const expected = new Map([
    ['Strict-Transport-Security', 'max-age=31536000; includeSubDomains'],
    ['X-Content-Type-Options', 'nosniff'],
    ['X-Frame-Options', 'DENY'],
    ['Referrer-Policy', 'strict-origin-when-cross-origin'],
    ['Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()'],
  ]);

  assert.deepEqual(configuredHeaders, expected);
  for (const header of expected.keys()) {
    assert.match(apache, new RegExp(`Header always set ${header}\\b`));
  }
  assert.doesNotMatch(apache + vercelSource, /Access-Control-Allow-Origin\s+["']?\*/i);
});
