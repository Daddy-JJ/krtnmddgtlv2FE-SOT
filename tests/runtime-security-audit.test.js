import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { safeReturnTo } from '../utils/auth-flow.js';
import { EmailTemplateService } from '../services/email-template-service.js';
import { ApiClient } from '../services/api-client.js';

const root = resolve(import.meta.dirname, '..');

const FE_D_010_RUNTIME_FILES = [
  'pages/admin/email-templates.js',
  'pages/admin/super-admin-workspace.js',
  'services/email-template-service.js',
  'validators/email-template-validator.js',
  'admin/mail/templates/index.html',
];

const FRONTEND_DIRECTORIES = ['pages', 'services', 'components', 'utils', 'validators'];

const FORBIDDEN_DOM_SINKS = [
  /\.innerHTML\s*=/,
  /\.outerHTML\s*=/,
  /document\.write\s*\(/,
  /insertAdjacentHTML\s*\(/,
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
];

const FORBIDDEN_STORAGE = [
  /localStorage/,
  /sessionStorage/,
];

const FORBIDDEN_INLINE_HANDLERS = [
  /\son(?:click|load|error|submit|focus|blur|change|input|keydown|keyup|mouseover)\s*=/i,
];

test('FE-D-010 runtime files are scanned by the same forbidden sink/storage rules', async () => {
  for (const file of FE_D_010_RUNTIME_FILES) {
    const source = await readFile(resolve(root, file), 'utf8');
    for (const pattern of FORBIDDEN_DOM_SINKS) {
      assert.doesNotMatch(source, pattern, `${file} matches ${pattern}`);
    }
    if (file.endsWith('.js')) {
      for (const pattern of [...FORBIDDEN_STORAGE, ...FORBIDDEN_INLINE_HANDLERS]) {
        assert.doesNotMatch(source, pattern, `${file} matches ${pattern}`);
      }
    }
  }
});

test('editor preview sets image src through DOM property and never injects HTML', async () => {
  const source = await readFile(resolve(root, 'pages/admin/email-templates.js'), 'utf8');
  assert.match(source, /image\.src\s*=\s*safeLogo/);
  assert.match(source, /safeHttpUrl\(doc\.logoUrl\)/);
  for (const pattern of FORBIDDEN_DOM_SINKS) {
    assert.doesNotMatch(source, pattern);
  }
});

test('no frontend source imports backend modules or bundler runtimes', async () => {
  const imports = [];
  for (const directory of FRONTEND_DIRECTORIES) {
    const files = (await import('node:fs/promises')).readdir(resolve(root, directory), { withFileTypes: true });
    for (const entry of await files) {
      if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
      const source = await readFile(resolve(root, directory, entry.name), 'utf8');
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
        imports.push(match[1]);
      }
    }
  }
  const forbiddenRuntimePackages = [
    'express',
    'cors',
    'body-parser',
    'cookie-parser',
    'helmet',
    'morgan',
    'pg',
    'mysql',
    'sequelize',
    'prisma',
    'webpack',
    'vite',
    'rollup',
    'esbuild',
    'parcel',
  ];
  for (const specifier of imports) {
    for (const forbidden of forbiddenRuntimePackages) {
      assert.notEqual(specifier, forbidden, `${specifier} must not be imported by frontend`);
      assert.doesNotMatch(specifier, new RegExp(`^${forbidden}/`));
    }
  }
});

test('safeReturnTo rejects Unicode line/paragraph separators used in header injection', () => {
  for (const separator of ['\u2028', '\u2029']) {
    const payload = `/app/?q=a${separator}Bcc: attacker@example.test`;
    assert.equal(safeReturnTo(payload), '', `U+${separator.codePointAt(0).toString(16)} must be rejected`);
  }
});

test('email template preview/test-send/publish/restore use the right CSRF context and idempotency', async () => {
  const calls = [];
  const client = new ApiClient({
    baseUrl: 'https://example.test/api/v1',
    cookieSource: () => 'csrf_token=access-csrf',
    fetchImpl: async (url, options) => {
      calls.push({
        url: String(url),
        method: options.method,
        csrf: options.headers.get('x-csrf-token'),
        idempotency: options.headers.get('idempotency-key'),
        body: options.body ? JSON.parse(options.body) : null,
      });
      return new Response(JSON.stringify({ success: true, data: {} }), {
        status: 200, headers: { 'content-type': 'application/json' },
      });
    },
  });
  const service = new EmailTemplateService(client);

  await service.saveDraft('starter.management', 'rev-1', { subject: 's' });
  await service.preview('starter.management', 'rev-1');
  await service.testSend('starter.management', 'rev-1', '11111111-1111-4111-8111-111111111111');
  await service.publish('starter.management', { draftRevision: 'rev-1', expectedPublishedVersion: null, reason: 'reviewed by owner' }, '22222222-2222-4222-8222-222222222222');
  await service.restore('starter.management', { version: 1, expectedRevision: 'rev-1', reason: 'restore draft' }, '33333333-3333-4333-8333-333333333333');

  const [save, preview, test, publish, restore] = calls;

  assert.equal(save.method, 'PUT');
  assert.equal(save.csrf, 'access-csrf');
  assert.equal(save.idempotency, null);
  assert.equal(preview.method, 'POST');
  assert.equal(preview.csrf, 'access-csrf');
  assert.equal(preview.idempotency, null);

  assert.equal(test.method, 'POST');
  assert.equal(test.csrf, 'access-csrf');
  assert.equal(test.body.confirm, true);
  assert.match(test.idempotency, /^[0-9a-f-]{36}$/);

  assert.equal(publish.method, 'POST');
  assert.equal(publish.csrf, 'access-csrf');
  assert.equal(publish.body.confirm, true);
  assert.equal(publish.body.reason.length, 17);
  assert.match(publish.idempotency, /^[0-9a-f-]{36}$/);

  assert.equal(restore.method, 'POST');
  assert.equal(restore.csrf, 'access-csrf');
  assert.equal(restore.body.confirm, true);
  assert.match(restore.idempotency, /^[0-9a-f-]{36}$/);
});

test('editor fall-back limits and required block guards match the SPEC defaults', async () => {
  const source = await readFile(resolve(root, 'validators/email-template-validator.js'), 'utf8');
  assert.match(source, /limits\.blocks \?\? 30/);
  assert.match(source, /limits\.parts \?\? 100/);
  assert.match(source, /limits\.paragraph \?\? 2000/);
  assert.match(source, /limits\.label \?\? 80/);
  assert.match(source, /limits\.subject \?\? 160/);
  assert.match(source, /limits\.preheader \?\? 200/);
  assert.match(source, /limits\.heading \?\? 160/);
  assert.match(source, /limits\.footer \?\? 1000/);
});

test('super admin workspace renders objects via textContent and never innerHTML', async () => {
  const source = await readFile(resolve(root, 'pages/admin/super-admin-workspace.js'), 'utf8');
  for (const pattern of FORBIDDEN_DOM_SINKS) {
    assert.doesNotMatch(source, pattern);
  }
  for (const pattern of FORBIDDEN_STORAGE) {
    assert.doesNotMatch(source, pattern);
  }
  assert.match(source, /\.textContent\s*=/);
});
