import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Vercel and fallback Apache apply the same baseline browser security headers', async () => {
  const [apache, vercelSource] = await Promise.all([
    readFile(new URL('../.htaccess', import.meta.url), 'utf8'),
    readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  ]);
  const vercel = JSON.parse(vercelSource);
  const defaultHeaders = vercel.headers?.find((entry) => entry.source === '/((?!preview/).+)');
  const homepageHeaders = vercel.headers?.find((entry) => entry.source === '/');
  const previewHeaders = vercel.headers?.find((entry) => entry.source === '/preview/:slug');
  const sitePreviewHeaders = vercel.headers?.find((entry) => entry.source === '/preview/');
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
  const homepageHeaderMap = new Map(homepageHeaders?.headers?.map(({ key, value }) => [key, value]) ?? []);
  assert.equal(homepageHeaderMap.get('Content-Security-Policy'), "frame-ancestors 'self' https://inovasia.co.id https://www.inovasia.co.id");
  assert.equal(homepageHeaderMap.has('X-Frame-Options'), false);
  assert.equal(homepageHeaderMap.has('X-Robots-Tag'), false);
  for (const key of ['Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) {
    assert.equal(homepageHeaderMap.get(key), expected.get(key));
  }
  const previewHeaderMap = new Map(previewHeaders?.headers?.map(({ key, value }) => [key, value]) ?? []);
  assert.equal(previewHeaderMap.get('Content-Security-Policy'), "frame-ancestors 'self' https://inovasia.co.id https://www.inovasia.co.id");
  assert.equal(previewHeaderMap.has('X-Frame-Options'), false);
  assert.equal(previewHeaderMap.get('X-Robots-Tag'), 'noindex, nofollow');
  const sitePreviewHeaderMap = new Map(sitePreviewHeaders?.headers?.map(({ key, value }) => [key, value]) ?? []);
  assert.equal(sitePreviewHeaderMap.get('Content-Security-Policy'), previewHeaderMap.get('Content-Security-Policy'));
  assert.equal(sitePreviewHeaderMap.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.equal(sitePreviewHeaderMap.has('X-Frame-Options'), false);
  const defaultPattern = new RegExp('^' + defaultHeaders.source + '$');
  assert.equal(defaultPattern.test('/'), false);
  assert.equal(defaultPattern.test('/preview/'), false);
  assert.equal(defaultPattern.test('/login/'), true);
  assert.equal(defaultPattern.test('/app/'), true);
  assert.equal(defaultPattern.test('/some-card-slug'), true);
  assert.ok(apache.includes('SetEnvIf Request_URI "^/$|^/preview(?:/|$)" knd_embed_route=1'));
  assert.ok(apache.includes('Header always set X-Frame-Options "DENY" env=!knd_embed_route'));
  assert.ok(apache.includes('Header always set Content-Security-Policy "frame-ancestors'));
  assert.ok(apache.includes('env=knd_embed_route'));
  assert.equal(vercel.rewrites.find((entry) => entry.source === '/preview/')?.destination, '/index.html');
  assert.ok(apache.includes('RewriteRule ^preview/?$ index.html [L]'));
  assert.ok(apache.includes('Header always set X-Robots-Tag "noindex, nofollow" env=knd_preview_route'));
  for (const header of expected.keys()) {
    assert.match(apache, new RegExp(`Header always set ${header}\\b`));
  }
  assert.doesNotMatch(apache + vercelSource, /Access-Control-Allow-Origin\s+["']?\*/i);
});
