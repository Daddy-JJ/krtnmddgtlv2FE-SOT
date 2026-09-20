import assert from 'node:assert/strict';
import { readFile, readdir, rm, mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ANALYTICS_HTML_FILES,
  buildStaticSite,
  injectVercelAnalytics,
  PUBLIC_DIRECTORIES,
  PUBLIC_ROOT_FILES,
} from '../scripts/build-static.mjs';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');

async function walkFiles(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkFiles(absolutePath, root));
    } else if (entry.isFile()) {
      files.push(path.relative(root, absolutePath).split(path.sep).join('/'));
    }
  }
  return files.sort();
}

test('static deployment output contains runtime files and excludes internal material', async (t) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'knd-static-build-'));
  const outputRoot = path.join(temporaryRoot, 'dist');
  t.after(() => rm(temporaryRoot, { recursive: true, force: true }));

  const copiedFiles = await buildStaticSite({
    sourceRoot: PROJECT_ROOT,
    outputRoot,
    clean: false,
  });
  const outputFiles = await walkFiles(outputRoot);

  assert.deepEqual(outputFiles, copiedFiles);
  for (const requiredPath of [
    'index.html',
    'assets/css/tailwind.css',
    'config/runtime-config.js',
    'pages/public/card.js',
    'public-card/index.html',
    'services/api-client.js',
    'admin/mail/templates/index.html',
  ]) {
    assert.ok(outputFiles.includes(requiredPath), `${requiredPath} must be deployed`);
  }

  for (const forbiddenPath of [
    'docs/hosting-handover.md',
    'tests/vercel-api-proxy.test.js',
    'package.json',
    'vercel.json',
    '.env.example',
    '.cpanel.yml',
    'CHANGELOG.md',
  ]) {
    assert.ok(!outputFiles.includes(forbiddenPath), `${forbiddenPath} must stay private`);
  }

  assert.ok(outputFiles.every((file) => !file.toLowerCase().endsWith('.md')));
  assert.ok(outputFiles.every((file) => !file.split('/').some((part) => part.startsWith('.'))));

  const analyticsFiles = new Set(ANALYTICS_HTML_FILES);
  for (const file of outputFiles.filter(file => file.endsWith('.html'))) {
    const html = await readFile(path.join(outputRoot, file), 'utf8');
    const expectedCount = analyticsFiles.has(file) ? 1 : 0;
    assert.equal(
      (html.match(/src="\/_vercel\/insights\/script\.js"/g) ?? []).length,
      expectedCount,
      file,
    );
  }
});

test('Vercel Analytics injection is idempotent and removes URL query and fragment data', () => {
  const source = '<!doctype html><html><head><title>Test</title></head><body></body></html>';
  const injected = injectVercelAnalytics(source);

  assert.equal(injectVercelAnalytics(injected), injected);
  assert.equal((injected.match(/src="\/_vercel\/insights\/script\.js"/g) ?? []).length, 1);
  assert.match(injected, /window\.va = window\.va \|\| function/);
  assert.match(injected, /url\.search = ''/);
  assert.match(injected, /url\.hash = ''/);
  assert.match(injected, /catch \{\s*return null;/);
  assert.ok(injected.indexOf('/_vercel/insights/script.js') < injected.indexOf('</head>'));
});

test('Vercel Analytics is limited to sitemap marketing pages', async () => {
  const sitemap = await readFile(path.join(PROJECT_ROOT, 'sitemap.xml'), 'utf8');
  const sitemapFiles = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(([, value]) => new URL(value).pathname)
    .map(pathname => pathname === '/' ? 'index.html' : `${pathname.slice(1)}index.html`)
    .sort();

  assert.deepEqual([...ANALYTICS_HTML_FILES].sort(), sitemapFiles);
  assert.ok(ANALYTICS_HTML_FILES.every(file => !/^(?:admin|app|specialist|public-card|starter)\//.test(file)));
});

test('deployment configuration uses an explicit static output boundary', async () => {
  const packageJson = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const devServer = await readFile(path.join(PROJECT_ROOT, 'scripts/dev-server.mjs'), 'utf8');
  const vercelConfig = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'vercel.json'), 'utf8'));
  const cpanelConfig = await readFile(path.join(PROJECT_ROOT, '.cpanel.yml'), 'utf8');
  const vercelIgnore = await readFile(path.join(PROJECT_ROOT, '.vercelignore'), 'utf8');

  assert.equal(packageJson.scripts['build:static'], 'node scripts/build-static.mjs');
  assert.equal(packageJson.scripts.dev, 'node scripts/dev-server.mjs');
  assert.match(devServer, /existsSync\('\.env'\)/);
  assert.doesNotMatch(devServer, /process\.loadEnvFile\?\.\(\)/);
  assert.match(packageJson.scripts.build, /build:static/);
  assert.equal(vercelConfig.outputDirectory, 'dist');
  assert.equal(vercelConfig.buildCommand, 'npm run build');
  assert.doesNotMatch(cpanelConfig, /cp -R \.\/\*/);
  assert.match(cpanelConfig, /npm run build:static/);
  assert.match(cpanelConfig, /dist\/\*/);
  assert.match(vercelIgnore, /^docs\/$/m);
  assert.match(vercelIgnore, /^tests\/$/m);
  assert.match(vercelIgnore, /^\/templates\/$/m);
  assert.doesNotMatch(vercelIgnore, /^templates\/$/m);

  assert.ok(!PUBLIC_DIRECTORIES.includes('docs'));
  assert.ok(!PUBLIC_DIRECTORIES.includes('tests'));
  assert.ok(!PUBLIC_DIRECTORIES.includes('api'));
  assert.ok(!PUBLIC_DIRECTORIES.includes('layouts'));
  assert.deepEqual(PUBLIC_ROOT_FILES, ['index.html', 'robots.txt', 'sitemap.xml']);
});
