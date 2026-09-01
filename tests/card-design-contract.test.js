import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ApiClient } from '../services/api-client.js';
import { filterThemes, validateThemeCode } from '../validators/theme-validator.js';

test('theme list is safe GET and theme update uses access CSRF', async () => {
  const requests = [];
  const client = new ApiClient({
    baseUrl: 'https://example.test/api/v1',
    cookieSource: () => 'csrf_token=access-csrf; starter_csrf_token=starter-csrf',
    fetchImpl: async (url, options) => {
      requests.push({ url, method: options.method, csrf: options.headers.get('x-csrf-token'), body: options.body ? JSON.parse(options.body) : null });
      const data = url.endsWith('/themes') ? [{ code: 'starter-clean', orientation: 'landscape', isAvailable: true }] : { themeCode: 'starter-clean' };
      return new Response(JSON.stringify({ success: true, data }), { status: 200 });
    },
  });

  await client.get('/cards/card-1/themes');
  await client.patch('/cards/card-1/theme', { themeCode: 'starter-clean' }, { csrfContext: 'access' });

  assert.deepEqual(requests.map((request) => request.csrf), [null, 'access-csrf']);
  assert.equal(requests[1].body.themeCode, 'starter-clean');
});

test('theme validator and orientation filter enforce locked catalog values', () => {
  const themes = [
    { code: 'starter-clean', orientation: 'landscape' },
    { code: 'pro-vertical-modern-dark', orientation: 'portrait' },
  ];

  assert.equal(validateThemeCode('starter-clean'), '');
  assert.equal(validateThemeCode('unknown-theme'), 'Tema tidak valid.');
  assert.equal(filterThemes(themes, 'portrait').length, 1);
  assert.equal(filterThemes(themes, 'all').length, 2);
});

test('design gallery renders isolated live templates before account entitlements resolve', async () => {
  const [source, sharedPreview, html, styles] = await Promise.all([
    readFile(new URL('../pages/app/card-design.js', import.meta.url), 'utf8'),
    readFile(new URL('../components/card-live-preview.js', import.meta.url), 'utf8'),
    readFile(new URL('../app/card/design/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../assets/css/app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(source, /loadCardThemePreviewCatalog/);
  assert.match(source, /mountCardThemePreview/);
  assert.match(source, /const catalog = await loadCardThemePreviewCatalog\(\)/);
  assert.doesNotMatch(source, /fetch\('\/config\/theme-registry\.json'/);
  assert.doesNotMatch(source, /attachShadow/);
  assert.match(sharedPreview, /fetch\('\/config\/theme-registry\.json'/);
  assert.match(sharedPreview, /fetch\('\/assets\/css\/card-themes\.css'/);
  assert.match(sharedPreview, /loadTemplateMarkup\(theme\.template\)/);
  assert.match(sharedPreview, /fetch\(path/);
  assert.match(source, /mergeEntitlements\(state\.themes, entitledThemes\)/);
  assert.match(sharedPreview, /name:\s*theme\.name/);
  assert.match(source, /button\.className = 'theme-option'/);
  assert.match(sharedPreview, /attachShadow\(\{ mode: 'closed' \}\)/);
  assert.match(sharedPreview, /root\.querySelector\('script, iframe, object, embed'\)/);
  assert.match(sharedPreview, /\.replace\(':root \{', ':host \{'\)/);
  assert.match(sharedPreview, /\.replace\('@media \(max-width: 620px\)', '@media \(max-width: 0px\)'\)/);
  assert.match(sharedPreview, /renderCardTheme\(root, initialCard\)/);
  assert.match(sharedPreview, /cache: 'no-cache'/);
  assert.doesNotMatch(source, /button\.disabled = !theme\.isAvailable/);
  assert.match(html, /data-theme-preview-stage/);
  assert.doesNotMatch(html, /data-theme-preview-image/);
  assert.match(styles, /\.card-theme-preview__host/);
});
