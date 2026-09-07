import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ApiClient } from '../services/api-client.js';
import { buildCatalogInput, buildSocialInput, validateCatalogInput, validateSocialInput } from '../validators/content-validator.js';

test('social/catalog reads omit CSRF and mutations use access CSRF', async () => {
  const requests = [];
  const client = new ApiClient({
    baseUrl: 'https://example.test/api/v1',
    cookieSource: () => 'csrf_token=access-csrf; starter_csrf_token=starter-csrf',
    fetchImpl: async (url, options) => {
      requests.push({ url, method: options.method, csrf: options.headers.get('x-csrf-token'), body: options.body ? JSON.parse(options.body) : null });
      return new Response(JSON.stringify({ success: true, data: [] }), { status: 200 });
    },
  });

  await client.get('/cards/card-1/social-links');
  await client.post('/cards/card-1/social-links', { platform: 'instagram', url: 'https://example.com', sortOrder: 0 }, { csrfContext: 'access' });
  await client.delete('/cards/card-1/social-links/1', { csrfContext: 'access' });
  await client.get('/cards/card-1/catalog-items');
  await client.post('/cards/card-1/catalog-items', { title: 'Item', description: null, targetUrl: null, sortOrder: 0, isPublished: true }, { csrfContext: 'access' });
  await client.delete('/cards/card-1/catalog-items/item-1', { csrfContext: 'access' });

  assert.deepEqual(requests.map((request) => request.csrf), [null, 'access-csrf', 'access-csrf', null, 'access-csrf', 'access-csrf']);
  assert.equal(requests[1].body.platform, 'instagram');
  assert.equal(requests[4].body.isPublished, true);
});

test('social and catalog validators match backend-facing minimum contract', () => {
  const social = buildSocialInput({ platform: 'linkedin', url: 'https://linkedin.com/in/demo', sortOrder: '2' });
  assert.deepEqual(validateSocialInput(social), {});
  assert.equal(validateSocialInput(buildSocialInput({ platform: 'bad', url: 'ftp://bad.test' })).platform, 'Platform tidak valid.');

  const catalog = buildCatalogInput({ title: 'Produk', description: '', targetUrl: '', sortOrder: '1', isPublished: 'on' });
  assert.deepEqual(catalog, { title: 'Produk', description: null, targetUrl: null, sortOrder: 1, isPublished: true });
  assert.deepEqual(validateCatalogInput(catalog), {});
  assert.equal(validateCatalogInput(buildCatalogInput({ title: '', targetUrl: 'ftp://bad.test' })).title, 'Judul wajib diisi.');
});

test('social and catalog deletion requires explicit user confirmation', async () => {
  const source = await readFile(new URL('../pages/app/card-content.js', import.meta.url), 'utf8');
  assert.match(source, /window\.confirm\(/);
  assert.match(source, /Tindakan ini tidak dapat dibatalkan/);
});

test('Starter content forms explain entitlement and lock unavailable creation', async () => {
  const source = await readFile(new URL('../pages/app/card-content.js', import.meta.url), 'utf8');
  assert.match(source, /isStarterPlan\(\)/);
  assert.match(source, /PLAN_LIMIT_REACHED/);
  assert.match(source, /Tautan sosial tidak tersedia pada paket Starter/);
  assert.match(source, /Katalog tidak tersedia pada paket Starter/);
  assert.match(source, /Batas tautan sosial untuk paket Anda telah tercapai/);
  assert.match(source, /Batas item katalog untuk paket Anda telah tercapai/);
  assert.match(source, /setCreateLocked\(true\)/);
  assert.match(source, /aria-disabled/);
  assert.doesNotMatch(source, /Sedang kami siapkan|Data siap/);
});

test('social and catalog creation assigns deterministic append order without exposing a fake reorder control', async () => {
  const [source, social, catalog] = await Promise.all([
    readFile(new URL('../pages/app/card-content.js', import.meta.url), 'utf8'),
    readFile(new URL('../app/card/social/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../app/card/catalog/index.html', import.meta.url), 'utf8'),
  ]);
  assert.match(source, /sortOrder: nextSortOrder\(\)/);
  assert.match(source, /\.sort\(compareItems\)/);
  assert.match(source, /data-content-count/);
  assert.doesNotMatch(social, /name="sortOrder"/);
  assert.doesNotMatch(catalog, /name="sortOrder"/);
  assert.match(social, /Edit dan ubah urutan belum tersedia/);
  assert.match(catalog, /Edit dan ubah urutan belum tersedia/);
});
