import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('Super Admin dashboard guards role, redirects anonymous sessions, exposes logout and tier totals', async () => {
  const [workspace, login, authFlow] = await Promise.all([
    readFile(resolve(root, 'pages/admin/super-admin-workspace.js'), 'utf8'),
    readFile(resolve(root, 'pages/auth/login.js'), 'utf8'),
    readFile(resolve(root, 'utils/auth-flow.js'), 'utf8'),
  ]);
  assert.match(workspace, /api\.get\('\/me'\)/);
  assert.match(workspace, /roles\.includes\('super_admin'\)/);
  assert.match(workspace, /error\.status===401[\s\S]*\/login\//);
  assert.match(workspace, /authService\.logout\(\)/);
  for (const tier of ['starterUsers', 'basicUsers', 'proUsers']) assert.match(workspace, new RegExp(tier));
  assert.match(login, /postLoginDestination/);
  assert.match(authFlow, /super_admin[\s\S]*\/admin\//);
  assert.doesNotMatch(workspace, /innerHTML|localStorage|sessionStorage/);
});

test('Super Admin mail outbox is sanitized and retry is explicitly confirmed', async () => {
  const [workspace, page] = await Promise.all([
    readFile(resolve(root, 'pages/admin/super-admin-workspace.js'), 'utf8'),
    readFile(resolve(root, 'admin/mail/index.html'), 'utf8'),
  ]);
  assert.match(page, /noindex,nofollow/);
  assert.match(page, /data-admin-view="mail"/);
  assert.match(workspace, /\/admin\/mail\/outbox\?limit=100/);
  assert.match(workspace, /maskedRecipient/);
  assert.match(workspace, /confirm:true/);
  assert.match(workspace, /window\.confirm/);
  assert.doesNotMatch(workspace, /recipientEmail|payloadText|subject/);
});

test('CV Specialist logout handles expired access tokens without hiding server errors', async () => {
  const [dashboard, request, auth] = await Promise.all([
    readFile(resolve(root, 'pages/specialist/dashboard.js'), 'utf8'),
    readFile(resolve(root, 'pages/specialist/request.js'), 'utf8'),
    readFile(resolve(root, 'services/auth-service.js'), 'utf8'),
  ]);
  for (const source of [dashboard, request]) {
    assert.match(source, /authService\.logout\(\)/);
    assert.match(source, /status\.textContent = error\.message/);
    assert.match(source, /logout\.disabled = false/);
  }
  assert.match(auth, /error\?\.status !== 401/);
  assert.match(auth, /api\.post\('\/auth\/refresh'/);
  assert.match(auth, /return request\(\);/);
});
