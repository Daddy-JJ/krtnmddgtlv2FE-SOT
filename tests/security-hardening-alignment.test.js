import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { apiErrorMessage, resumeUploadStateMessage } from '../utils/api-error-message.js';
import { billingStatusLabel } from '../validators/payment-validator.js';

const root = new URL('../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

test('security errors retain distinct safe recovery guidance', () => {
  assert.equal(apiErrorMessage({ code: 'INVALID_CREDENTIALS' }), 'Password saat ini salah.');
  assert.match(apiErrorMessage({ code: 'RECENT_AUTH_REQUIRED' }), /login ulang/);
  assert.match(apiErrorMessage({ code: 'CSRF_INVALID' }), /Sesi keamanan/);
  assert.match(apiErrorMessage({ code: 'RATE_LIMITED' }), /Terlalu banyak permintaan/);
  assert.match(apiErrorMessage({ code: 'AUTH_BUSY' }), /autentikasi sedang sibuk/);
  assert.match(apiErrorMessage({ code: 'RESOURCE_READ_ONLY' }), /hanya dapat dibaca/);
});

test('logout refreshes and redirects only for AUTH_REQUIRED', async () => {
  const [auth, shell, admin] = await Promise.all([
    source('services/auth-service.js'),
    source('components/app-shell.js'),
    source('pages/admin/super-admin-workspace.js'),
  ]);
  assert.match(auth, /status !== 401 \|\| error\?\.code !== 'AUTH_REQUIRED'/);
  assert.match(shell, /status === 401 && error\?\.code === 'AUTH_REQUIRED'/);
  assert.match(admin, /status===401&&error\?\.code==='AUTH_REQUIRED'/);
  assert.match(auth, /synchronizeAccessCsrf\(\)/);
  assert.match(auth, /forceAccessCsrf: true/);
});

test('account keeps email mutation absent until a product caller exists', async () => {
  const [account, auth] = await Promise.all([
    source('pages/app/account.js'),
    source('services/auth-service.js'),
  ]);
  assert.doesNotMatch(account + auth, /api\.(?:put|patch)\(['"]\/me/);
  assert.doesNotMatch(account, /currentPassword/);
});

test('generic admin data stays read-only while domain mutations remain', async () => {
  const [service, workspace] = await Promise.all([
    source('services/admin-operations-service.js'),
    source('pages/admin/super-admin-workspace.js'),
  ]);
  assert.doesNotMatch(service + workspace, /(?:post|put|patch|delete)\([^\n]*\/admin\/data/);
  assert.match(service, /patch\(`\$\{adminRoot\}\/feedback\/\$\{publicPath\(publicId\)\}\/status`/);
  assert.match(workspace, /RESOURCE_READ_ONLY/);
});

test('Resume scanner failures never render as success and legacy signature-only scans are warned', async () => {
  const [service, create, detail, admin, specialist] = await Promise.all([
    source('services/resume-service.js'),
    source('pages/app/resume-enhancement-new.js'),
    source('pages/app/resume-enhancement-detail.js'),
    source('pages/admin/resume-request-workspace.js'),
    source('pages/specialist/request.js'),
  ]);
  for (const code of ['RESUME_SCANNER_UNAVAILABLE', 'RESUME_SCANNER_BUSY', 'RESUME_FILE_UNSAFE']) {
    assert.match(resumeUploadStateMessage({
      RESUME_SCANNER_UNAVAILABLE: 'scanner-unavailable',
      RESUME_SCANNER_BUSY: 'scanner-busy',
      RESUME_FILE_UNSAFE: 'file-unsafe',
    }[code]), /Berkas belum diterima|ditolak/);
  }
  assert.match(service, /files\`,form,\{skipRefresh:true\}/);
  assert.match(create, /resumeUploadState\(error\)/);
  assert.match(detail, /resumeUploadStateMessage/);
  assert.match(admin + specialist, /CLEAN_SIGNATURE_ONLY/);
  assert.match(admin + specialist, /pemindaian antivirus sebelum file dapat dianggap aman/);
});

test('refund states render and reconciliation reloads subscription, payments, and cards', async () => {
  const [billing, paymentService] = await Promise.all([
    source('pages/app/billing.js'),
    source('services/payment-service.js'),
  ]);
  assert.equal(billingStatusLabel('refunded'), 'Dikembalikan');
  assert.equal(billingStatusLabel('refund_pending_review'), 'Pengembalian menunggu peninjauan');
  assert.match(billing, /paymentService\.currentSubscription/);
  assert.match(billing, /paymentService\.listPayments/);
  assert.match(billing, /cardService\.list/);
  assert.match(paymentService, /reconcile[\s\S]*skipRefresh: true/);
  assert.doesNotMatch(billing, /paymentService\.checkout/);
});

test('public health consumers require only the healthy status field', async () => {
  const apiClientTests = await source('tests/api-client.test.js');
  assert.match(apiClientTests, /data: \{ status: 'healthy' \}/);
  assert.doesNotMatch(apiClientTests, /data: \{[^}]*database(?:LatencyMs)?/);
});
