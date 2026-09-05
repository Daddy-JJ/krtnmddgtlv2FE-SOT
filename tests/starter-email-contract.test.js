import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const createPage = await readFile(new URL('../pages/starter/create.js', import.meta.url), 'utf8');
const starterService = await readFile(new URL('../services/starter-service.js', import.meta.url), 'utf8');
const managePage = await readFile(new URL('../pages/starter/manage.js', import.meta.url), 'utf8');

test('Starter creation only reports email delivery for an explicit true flag', () => {
  assert.match(createPage, /const emailSent = card\?\.emailSent === true;/);
  assert.doesNotMatch(createPage, /emailSent === false/);
  assert.match(createPage, /Kartu berhasil dibuat, tetapi email pengelolaan gagal dikirim/);
});

test('Starter create allows SMTP response time and never opts into refresh retry', () => {
  assert.match(starterService, /STARTER_CREATE_TIMEOUT_MS = 30_000/);
  assert.match(starterService, /timeoutMs: STARTER_CREATE_TIMEOUT_MS/);
  assert.match(starterService, /skipRefresh: true/);
});

test('Starter email access uses the token exchange contract without CSRF', () => {
  assert.match(starterService, /api\.post\('\/starter\/access'/);
  assert.match(starterService, /csrfContext: null/);
  assert.match(starterService, /skipRefresh: true/);
});

test('Starter manage consumes the fragment token and removes it after exchange', () => {
  assert.match(managePage, /location\.hash\.slice\(1\)/);
  assert.match(managePage, /starterService\.openAccess\(publicId, token\)/);
  assert.match(managePage, /history\.replaceState/);
  assert.match(managePage, /rememberStarterClaim\(publicId\)/);
});
