import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { EmailTemplateService, createIdempotencyKey } from '../services/email-template-service.js';
import { validateEmailTemplateContent } from '../validators/email-template-validator.js';

const root = resolve(import.meta.dirname, '..');
const detail = {
  actions: ['cardUrl'], systems: ['starterAccessNotice'], variables: [{ name: 'fullName' }],
  limits: { subject: 160, preheader: 200, heading: 160, footer: 1000, paragraph: 2000, label: 80, blocks: 30, parts: 100 },
};
const content = {
  schemaVersion: 1, locale: 'id', subject: 'Selamat datang', preheader: '', heading: 'Halo', footer: '',
  blocks: [
    { type: 'paragraph', parts: [{ text: 'Halo ', emphasis: 'normal' }, { variable: 'fullName', emphasis: 'strong' }] },
    { type: 'action', targetVariable: 'cardUrl', label: 'Buka kartu' },
    { type: 'system', key: 'starterAccessNotice' },
  ],
  style: { logoAssetKey: null, logoAlt: '', backgroundColor: '#ffffff', textColor: '#172033', accentColor: '#006b80' },
};

test('email template validator accepts structured content and protects required blocks', () => {
  assert.equal(validateEmailTemplateContent(content, detail).valid, true);
  const missing = structuredClone(content); missing.blocks.pop();
  assert.equal(validateEmailTemplateContent(missing, detail).valid, false);
  const rawHtml = structuredClone(content); rawHtml.heading = '<script>';
  assert.equal(validateEmailTemplateContent(rawHtml, detail).valid, false);
  const headerInjection = structuredClone(content); headerInjection.subject = 'Halo\nBcc: attacker@example.test';
  assert.equal(validateEmailTemplateContent(headerInjection, detail).valid, false);
});

test('email template service uses confirmed paths and sensitive idempotency options', async () => {
  const calls = [];
  const client = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return Promise.resolve({}); } });
  const service = new EmailTemplateService(client);
  await service.saveDraft('starter.management', 'revision', content);
  await service.preview('starter.management', 'revision');
  await service.testSend('starter.management', 'revision', '11111111-1111-4111-8111-111111111111');
  await service.publish('starter.management', { draftRevision: 'revision', expectedPublishedVersion: null, reason: 'Reviewed copy' }, '22222222-2222-4222-8222-222222222222');
  await service.restore('starter.management', { version: 1, expectedRevision: 'revision', reason: 'Restore reviewed' }, '33333333-3333-4333-8333-333333333333');
  assert.deepEqual(calls.map(call => [call[0], call[1]]), [
    ['put', '/admin/mail/templates/starter.management/draft'],
    ['post', '/admin/mail/templates/starter.management/preview'],
    ['post', '/admin/mail/templates/starter.management/test-send'],
    ['post', '/admin/mail/templates/starter.management/publish'],
    ['post', '/admin/mail/templates/starter.management/restore'],
  ]);
  for (const call of calls.slice(2)) {
    assert.equal(call[3].skipRefresh, true);
    assert.match(call[3].headers['Idempotency-Key'], /^[0-9a-f-]{36}$/);
    assert.equal(call[2].confirm, true);
  }
});

test('idempotency fallback produces an RFC 4122 version 4 UUID', () => {
  const fakeCrypto = { getRandomValues(array) { array.fill(7); return array; } };
  assert.match(createIdempotencyKey(fakeCrypto), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test('Super Admin exposes one safe email editor route through the existing shell', async () => {
  const [html, shell, page] = await Promise.all([
    readFile(resolve(root, 'admin/mail/templates/index.html'), 'utf8'),
    readFile(resolve(root, 'pages/admin/super-admin-workspace.js'), 'utf8'),
    readFile(resolve(root, 'pages/admin/email-templates.js'), 'utf8'),
  ]);
  assert.match(html, /data-admin-view="email-templates"/);
  assert.match(shell, /Template email/);
  assert.match(shell, /renderEmailTemplateManager/);
  assert.match(shell, /resume_service_admin/);
  assert.doesNotMatch(shell, /resume_quality_reviewer/);
  assert.match(page, /saveDraft|preview|testSend|publish|versions|restore/);
  assert.doesNotMatch(page, /innerHTML|localStorage|sessionStorage/);
});
