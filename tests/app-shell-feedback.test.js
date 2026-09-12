import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateFeedback } from '../validators/feedback-validator.js';

const root = new URL('../', import.meta.url);
const pages = [
  'app/index.html', 'app/card/identity/index.html',
  'app/card/design/index.html', 'app/card/settings/index.html', 'app/card/social/index.html',
  'app/card/catalog/index.html', 'app/billing/index.html', 'app/account/index.html',
  'app/feedback/index.html', 'app/resume-enhancement/index.html',
  'app/resume-enhancement/new/index.html', 'app/resume-enhancement/request/index.html',
  'app/resume-enhancement/revision/index.html',
];

test('every authenticated user page loads the shared application shell', async () => {
  for (const page of pages) {
    const source = await readFile(new URL(page, root), 'utf8');
    assert.match(source, /\/components\/app-shell\.js/, page);
    assert.match(source, /<html lang="id" class="app-theme-dark">/, page);
    assert.match(source, /<body class="[^"]*\bdashboard-shell\b[^"]*\bapp-shell-page\b/, page);
  }
});

test('shared shell avoids delayed exit flashes and keeps a reduced-motion-aware entrance', async () => {
  const [script, css] = await Promise.all([
    readFile(new URL('components/app-shell.js', root), 'utf8'),
    readFile(new URL('assets/css/app.css', root), 'utf8'),
  ]);
  assert.match(script, /\/app\/feedback\//);
  assert.match(script, /\['\/app\/resume-enhancement\/', 'Perbaikan CV'\]/);
  assert.match(script, /currentPath\.startsWith\(targetPath\)/);
  assert.doesNotMatch(script, /app-shell--leaving|setTimeout\(\(\) => location\.assign/);
  assert.match(script, /fetch\(destination\.href/);
  assert.match(script, /history\.pushState/);
  assert.match(script, /document\.startViewTransition/);
  assert.match(script, /import\(`\$\{source\}\?navigation=/);
  assert.match(css, /html\.app-theme-dark[\s\S]*color-scheme:\s*dark/);
  assert.match(css, /\.app-shell-page[\s\S]*background-color:\s*#070a18/);
  assert.doesNotMatch(css, /\.app-shell--leaving/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /header:not\(\.app-shell__header\)/);
});

test('identity and contact are merged into one Kartu Nama editor with a legacy redirect', async () => {
  const [shell, dashboard, editor, legacyContact] = await Promise.all([
    readFile(new URL('components/app-shell.js', root), 'utf8'),
    readFile(new URL('app/index.html', root), 'utf8'),
    readFile(new URL('app/card/identity/index.html', root), 'utf8'),
    readFile(new URL('app/card/contact/index.html', root), 'utf8'),
  ]);
  const fields = [
    'namePrefix', 'firstName', 'lastName', 'jobTitle', 'organization',
    'officePhone', 'mobilePhone', 'email', 'websiteUrl',
    'addressStreet', 'addressCity', 'addressProvince', 'addressPostalCode', 'addressCountry',
  ];

  assert.match(shell, /\['\/app\/card\/identity\/', 'Kartu Nama'\]/);
  assert.doesNotMatch(shell, /\['\/app\/card\/contact\//);
  assert.match(dashboard, />Kartu Nama<\/a>/);
  for (const field of fields) assert.match(editor, new RegExp(`name="${field}"`), field);
  assert.match(editor, /data-editor-section="card"/);
  assert.match(legacyContact, /url=\/app\/card\/identity\//);
});

test('feedback validator enforces a trimmed 1-300 character message', () => {
  assert.equal(validateFeedback({ message: ' ' }).valid, false);
  assert.equal(validateFeedback({ message: 'x'.repeat(301) }).valid, false);
  assert.deepEqual(validateFeedback({ message: '  useful  ' }).value, { message: 'useful' });
});

test('Vercel serves only the allowlisted static build directory', async () => {
  const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));
  assert.equal(config.buildCommand, 'npm run build');
  assert.equal(config.outputDirectory, 'dist');
});

test('runtime routing takes API configuration from deployment environment', async () => {
  const [runtimeConfig, appConfig, proxySource] = await Promise.all([
    readFile(new URL('config/runtime-config.js', root), 'utf8'),
    readFile(new URL('config/app-config.js', root), 'utf8'),
    readFile(new URL('api/v1/[...path].js', root), 'utf8'),
  ]);
  const config = JSON.parse(await readFile(new URL('vercel.json', root), 'utf8'));

  assert.match(runtimeConfig, /__PUBLIC_API_BASE_URL__/);
  assert.match(runtimeConfig, /['"]\/api\/v1['"]/);
  assert.doesNotMatch(runtimeConfig, /api\.kartunamadigital\.id/);
  assert.match(appConfig, /apiBaseUrl:[^\n]+['"]\/api\/v1['"]/);
  assert.deepEqual(config.rewrites, [
    {
      source: '/api/v1/:path*',
      destination: '/api/v1/[...path]',
    },
    {
      source: '/:slug',
      destination: '/public-card/index.html',
    },
  ]);
  assert.match(proxySource, /BACKEND_API_BASE_URL/);
  assert.match(proxySource, /url\.protocol !== 'https:'/);
  assert.match(proxySource, /\.trycloudflare\.com/);
  assert.doesNotMatch(JSON.stringify(config), /trycloudflare\.com/);
});
