import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Vercel and fallback Apache apply the same baseline browser security headers', async () => {
  const [apache, vercelSource] = await Promise.all([
    readFile(new URL('../.htaccess', import.meta.url), 'utf8'),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  ]);
  const vercel = JSON.parse(vercelSource);
  const defaultHeaders = vercel.headers?.find((entry) => entry.source === '/((?!preview/).*)');
  const previewHeaders = vercel.headers?.find((entry) => entry.source === '/preview/:slug');
  const configuredHeaders = new Map(
    defaultHeaders?.headers
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
  const previewHeaderMap = new Map(previewHeaders?.headers?.map(({ key, value }) => [key, value]) ?? []);
  assert.equal(previewHeaderMap.get('Content-Security-Policy'), "frame-ancestors 'self' https://inovasia.co.id https://www.inovasia.co.id");
  assert.equal(previewHeaderMap.has('X-Frame-Options'), false);
  assert.equal(defaultHeaders?.source, '/((?!preview/).*)');
  for (const header of expected.keys()) {
    assert.match(apache, new RegExp(`Header always set ${header}\\b`));
  }
  assert.doesNotMatch(apache + vercelSource, /Access-Control-Allow-Origin\s+["']?\*/i);
});
