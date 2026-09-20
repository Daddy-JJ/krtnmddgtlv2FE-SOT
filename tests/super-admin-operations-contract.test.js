import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AdminOperationsService } from '../services/admin-operations-service.js';

const root = resolve(import.meta.dirname, '..');
const source = path => readFile(resolve(root, path), 'utf8');

test('Feedback menu and noindex route use the shared Super Admin controller', async () => {
  const [workspace, html] = await Promise.all([
    source('pages/admin/super-admin-workspace.js'),
    source('admin/feedback/index.html'),
  ]);
  assert.match(workspace, /\['Feedback','\/admin\/feedback\/'/);
  assert.match(workspace, /dataset\.feedbackBadge/);
  assert.match(html, /data-admin-view="feedback"/);
  assert.match(html, /noindex,nofollow/);
  assert.match(html, /super-admin-workspace\.js/);
});

test('Feedback inbox uses only the dedicated list and status endpoints', async () => {
  const calls = [];
  const client = {
    async get(path, options) {
      calls.push(['get', path, options]);
      return { success: true, data: [], meta: { page: 2, limit: 50, total: 0, pages: 1 } };
    },
    async patch(path, body, options) {
      calls.push(['patch', path, body, options]);
      return { publicId: 'feedback-1', status: body.status };
    },
  };
  const service = new AdminOperationsService(client);
  const result = await service.feedback({ page: 2, limit: 50, status: 'new', search: 'email', from: '2026-09-01', to: '2026-09-20' });
  await service.updateFeedbackStatus('feedback-1', { status: 'in_review', reason: 'Feedback sudah ditinjau.', confirm: true });
  assert.deepEqual(result.meta, { page: 2, limit: 50, total: 0, pages: 1 });
  assert.match(calls[0][1], /^\/admin\/feedback\?page=2&limit=50&status=new&search=email&from=2026-09-01&to=2026-09-20$/);
  assert.deepEqual(calls[0][2], { includeEnvelope: true });
  assert.equal(calls[1][1], '/admin/feedback/feedback-1/status');
  assert.deepEqual(calls[1][3], { csrfContext: 'access' });
  assert.equal('createFeedback' in service, false);
  assert.equal('deleteFeedback' in service, false);
});

test('Feedback filters, pagination and guarded status mutation retain the required contract', async () => {
  const workspace = await source('pages/admin/super-admin-workspace.js');
  for (const key of ['page','limit','status','search','from','to']) assert.match(workspace, new RegExp(`['"]${key}['"]`));
  assert.match(workspace, /new URLSearchParams\(location\.search\)/);
  assert.match(workspace, /params\.set\('page'/);
  assert.match(workspace, /reason\.minLength=10/);
  assert.match(workspace, /confirm:true/);
  assert.match(workspace, /window\.confirm/);
  assert.match(workspace, /if\(submit\.disabled\)return/);
  assert.match(workspace, /submit\.disabled=true/);
  assert.match(workspace, /FEEDBACK_STATUS_UNCHANGED/);
  assert.match(workspace, /await renderFeedback\(\)/);
});

test('Dashboard is an explicit operational command center', async () => {
  const workspace = await source('pages/admin/super-admin-workspace.js');
  for (const heading of ['Perlu tindakan','User dan subscription','Kartu dan tier','Resume Service','Mail dan feedback']) assert.match(workspace, new RegExp(heading));
  for (const key of ['newFeedback','feedbackInReview','oldestNewFeedbackHours','failedEmail','mailQueue','expiringSubscriptions','suspendedUsers','unassignedResumeRequests','qualityReviewQueue','slaDueWithin24Hours','slaBreached','starterUsers','basicUsers','proUsers']) assert.match(workspace, new RegExp(key));
  for (const link of ['Feedback','Mail Outbox','Resume Services','Users','Kartu']) assert.match(workspace, new RegExp(`['"]${link}['"]`));
});

test('Card search, detail and interventions use final backend routes and safe failure copy', async () => {
  const calls = [];
  const client = {
    get(path) { calls.push(['get', path]); return Promise.resolve({}); },
    post(path, body, options) { calls.push(['post', path, body, options]); return Promise.resolve({}); },
  };
  const service = new AdminOperationsService(client);
  await service.cards('owner@example.com');
  await service.card('card-public-id');
  await service.interveneCard('card-public-id', { action: 'RELEASE_CARD', reason: 'Relasi akun salah.', confirm: true });
  assert.equal(calls[0][1], '/admin/cards?q=owner%40example.com');
  assert.equal(calls[1][1], '/admin/cards/card-public-id');
  assert.equal(calls[2][1], '/admin/cards/card-public-id/interventions');
  assert.deepEqual(calls[2][3], { csrfContext: 'access' });
  const workspace = await source('pages/admin/super-admin-workspace.js');
  for (const value of ['CONNECT_MATCHING_VERIFIED_ACCOUNT','RELEASE_CARD','CARD_ALREADY_CONNECTED','CARD_NOT_CONNECTED','MATCHING_VERIFIED_ACCOUNT_NOT_FOUND','PLAN_LIMIT_REACHED','RECENT_AUTH_REQUIRED']) assert.match(workspace, new RegExp(value));
  assert.match(workspace, /kartu akan dilepaskan dari akun sampai dihubungkan kembali/i);
});

test('Reports, System and Security use distinct endpoints and explicit safe renderers', async () => {
  const calls = [];
  const client = { get(path) { calls.push(path); return Promise.resolve({}); } };
  const service = new AdminOperationsService(client);
  await service.reports(90);await service.system();await service.security();
  assert.deepEqual(calls, ['/admin/reports?days=90','/admin/system','/admin/security']);
  const workspace = await source('pages/admin/super-admin-workspace.js');
  for (const field of ['userRegistrations','feedbackByStatus','subscriptionsByTier','mailByStatus','resumeByStatus','databaseLatencyMs','queuedMail','processingMail','failedMail','activeSessions','revokedSessions24Hours','activeRateLimitBuckets','pendingPasswordResets','pendingOtps']) assert.match(workspace, new RegExp(field));
  assert.match(workspace, /allowed=\[7,30,90,365\]/);
  assert.doesNotMatch(workspace, /admin\.activity|\/admin\/activity/);
});

test('Super Admin guard runs before operations and all states are represented', async () => {
  const workspace = await source('pages/admin/super-admin-workspace.js');
  const guard = workspace.indexOf("roles.includes('super_admin')");
  const firstStatistics = workspace.indexOf('admin.statistics()', guard);
  assert.ok(guard > 0 && firstStatistics > guard);
  assert.match(workspace, /error\.status===401[\s\S]*\/login\//);
  assert.match(workspace, /location\.replace\(roles\.includes\('cv_specialist'\)\?'\/specialist\/'\:'\/app\/'\)/);
  for (const state of ["dataset.state='loading'","dataset.state='empty'","dataset.state='error'"]) assert.ok(workspace.includes(state));
});

test('Admin rendering stays text-only and redacts sensitive response fields', async () => {
  const workspace = await source('pages/admin/super-admin-workspace.js');
  assert.doesNotMatch(workspace, /innerHTML|localStorage|sessionStorage/);
  assert.match(workspace, /\.textContent=/);
  for (const field of ['internalId','storagePath','passwordHash','tokenHash','secret']) assert.match(workspace, new RegExp(field));
  assert.match(workspace, /isSafeAdminField/);
  assert.match(workspace, /Data terstruktur disembunyikan/);
});

test('Responsive grouped navigation exposes every approved menu group', async () => {
  const [workspace, css] = await Promise.all([
    source('pages/admin/super-admin-workspace.js'),
    source('assets/css/foundations-primitives.css'),
  ]);
  for (const group of ['Overview','Customer operations','Content & communication','Service operations','Governance']) assert.ok(workspace.includes(group));
  assert.match(css, /\.admin-navigation/);
  assert.match(css, /@media \(max-width: 47\.99rem\)[\s\S]*\.admin-navigation__links/);
});
