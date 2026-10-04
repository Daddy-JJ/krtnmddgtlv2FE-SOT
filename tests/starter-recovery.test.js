import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { ApiClient } from '../services/api-client.js';

const id = '3d2f31a4-7c83-47e1-b938-d5c1c7e7d160';
const item = { publicId: id, displayName: '<script>fixture</script>', slug: 'AbcDefg', createdAt: '2026-10-04T00:00:00Z' };
const list = { items: [item], limit: 20, offset: 0, hasMore: false };
const source = await readFile(new URL('../services/starter-service.js', import.meta.url), 'utf8');
const dashboard = await readFile(new URL('../pages/app/dashboard.js', import.meta.url), 'utf8');
const service = api => runInNewContext(source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + '\nstarterService;', { api });

test('recovery list uses authenticated endpoint, validates shape, and projects only approved fields', async () => {
  let path;
  const s = service({ get: async p => { path = p; return { success: true, data: { ...list, items: [{ ...item, token: 'not-for-browser' }] } }; } });
  const data = await s.claimCandidates();
  assert.equal(path, '/starter/claim-candidates?limit=20&offset=0');
  assert.deepEqual(Object.keys(data.items[0]), ['publicId', 'displayName', 'slug', 'createdAt']);
  for (const malformed of [null, {}, { ...list, items: [{}] }, { ...list, offset: 20 }, { ...list, hasMore: 'true' }]) {
    await assert.rejects(service({ get: async () => ({ success: true, data: malformed }) }).claimCandidates(), { code: 'STARTER_RECOVERY_INVALID' });
  }
  await assert.rejects(s.claimCandidates(1001), { code: 'STARTER_RECOVERY_INVALID' });
});

test('confirmed recovery uses fresh normal CSRF, cookies and confirm only; same-owner replay succeeds', async () => {
  for (const alreadyOwned of [false, true]) {
    const calls = [];
    const api = new ApiClient({ baseUrl: 'https://fixture.invalid/api/v1', cookieSource: () => 'starter_csrf_token=wrong; csrf_token=stale', fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return Response.json({ success: true, data: url.endsWith('/csrf') ? { csrfToken: 'fresh-session' } : { card: item, alreadyOwned } });
    } });
    const result = await service(api).claimCandidate(id);
    assert.equal(result.alreadyOwned, alreadyOwned);
    assert.equal(calls.length, 2);
    const post = calls[1]; assert.equal(post.url.endsWith(`/starter/claim-candidates/${id}/claim`), true);
    assert.equal(post.options.credentials, 'include'); assert.equal(post.options.headers.get('X-CSRF-Token'), 'fresh-session');
    assert.deepEqual(JSON.parse(post.options.body), { confirm: true });
  }
});

for (const [status, code] of [[401, 'AUTH_REQUIRED'], [403, 'CSRF_INVALID'], [404, 'STARTER_NOT_ELIGIBLE'], [409, 'STARTER_ALREADY_OWNED'], [422, 'VALIDATION_ERROR'], [429, 'RATE_LIMITED'], [500, 'HTTP_ERROR']]) {
  test(`recovery ${status}/${code} never retries POST or refreshes mutation`, async () => {
    const paths = [];
    const api = new ApiClient({ baseUrl: 'https://fixture.invalid/api/v1', cookieSource: () => '', fetchImpl: async url => {
      paths.push(url);
      return url.endsWith('/csrf') ? Response.json({ success: true, data: { csrfToken: 'fresh' } })
        : Response.json({ success: false, code }, { status });
    } });
    await assert.rejects(service(api).claimCandidate(id), { status, code });
    assert.equal(paths.length, 2); assert.equal(paths.some(p => p.endsWith('/refresh')), false);
  });
}

test('session change during CSRF synchronization cancels before claim POST', async () => {
  const controller = new AbortController();
  await assert.rejects(service({ synchronizeAccessCsrf: async () => controller.abort(), post: () => assert.fail('late POST') })
    .claimCandidate(id, { signal: controller.signal }), { code: 'REQUEST_ABORTED' });
});

function element() {
  return { hidden: false, disabled: false, textContent: '', children: [], dataset: {}, isConnected: true, classList: { toggle() {} },
    setAttribute() {}, removeAttribute() {}, append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; } };
}
async function harness(overrides = {}) {
  const nodes = new Map(); const events = {}; let clicks; let claims = 0; let reads = 0; let candidateReads = 0; let owned = false;
  const root = element(); root.hidden = true;
  const get = selector => { if (!nodes.has(selector)) nodes.set(selector, element()); return nodes.get(selector); };
  root.querySelector = get;
  root.querySelectorAll = () => [get('[data-recovery-retry]'), get('[data-recovery-prev]'), get('[data-recovery-next]'), ...get('[data-recovery-list]').children.flatMap(row => row.children.filter(n => n.type === 'button'))];
  root.addEventListener = (_event, handler) => { clicks = handler; }; root.contains = () => true;
  const sandbox = { URLSearchParams, AbortController, Date, Intl, setTimeout, clearTimeout, location: { search: '', origin: 'https://fixture.invalid', assign: p => { sandbox.destination = p; } },
    document: { querySelector: s => s === '[data-starter-recovery]' ? root : get(s), querySelectorAll: () => [], createElement: element, addEventListener: () => {}, dispatchEvent: () => {} },
    addEventListener: (name, handler) => { events[name] = handler; },
    window: { confirm: () => overrides.confirm !== false }, safeHttpUrl: x => x || '', forgetStarterClaim: () => { sandbox.forgot = true; },
    dashboardService: { loadOverview: async () => { reads++; return overrides.overview ? overrides.overview() : { cards: owned || overrides.owned ? [{ publicId: id, planCode: 'starter', contact: { fullName: 'Owned' } }] : [], subscription: null }; } },
    starterService: { claimCandidates: async offset => { candidateReads++; return overrides.candidates ? overrides.candidates(offset) : { ...list, offset }; },
      claimCandidate: async publicId => { claims++; assert.equal(publicId, id); if (overrides.claim) return overrides.claim(); owned = true; return { card: item, alreadyOwned: false }; } },
  };
  runInNewContext(dashboard.replace(/^import .*;\r?\n/gm, ''), sandbox);
  await new Promise(resolve => setImmediate(resolve));
  const button = () => get('[data-recovery-list]').children[0]?.children.at(-1);
  const click = target => clicks({ target: { closest: () => target } });
  return { root, get, events, sandbox, button, click, claims: () => claims, reads: () => reads, candidateReads: () => candidateReads };
}

test('empty dashboard lists candidates with safe text and no auto claim; owned dashboard skips lookup', async () => {
  const h = await harness(); assert.equal(h.claims(), 0); assert.equal(h.root.hidden, false);
  assert.equal(h.get('[data-recovery-list]').children[0].children[0].textContent, item.displayName);
  const owned = await harness({ owned: true }); assert.equal(owned.candidateReads(), 0); assert.equal(owned.root.hidden, true);
  assert.doesNotMatch(dashboard, /innerHTML|localStorage|sessionStorage/);
});

test('cancel confirmation does not claim; success reloads owned dashboard and clears management context', async () => {
  const cancel = await harness({ confirm: false }); await cancel.click(cancel.button()); assert.equal(cancel.claims(), 0); assert.equal(cancel.button().disabled, false);
  const h = await harness(); await h.click(h.button()); assert.equal(h.claims(), 1); assert.equal(h.reads(), 2);
  assert.equal(h.root.hidden, true); assert.equal(h.sandbox.forgot, true); assert.match(h.get('[data-app-status]').textContent, /berhasil dihubungkan/);
});

test('rapid double click is blocked before await', async () => {
  let finish; const h = await harness({ claim: () => new Promise(resolve => { finish = resolve; }) });
  const button = h.button(); const first = h.click(button); await h.click(button); assert.equal(h.claims(), 1); assert.equal(button.disabled, true);
  finish({ card: item }); await first;
});

test('late candidates after user switch never render previous-account data', async () => {
  let finish; const h = await harness({ candidates: () => new Promise(resolve => { finish = resolve; }) });
  h.events['payment:session-changed'](); finish(list); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.root.hidden, true); assert.equal(h.get('[data-recovery-list]').children.length, 0); assert.equal(h.claims(), 0);
});

for (const [status, code, message] of [[403, 'EMAIL_VERIFICATION_REQUIRED', /Verifikasi/], [403, 'CSRF_INVALID', /Sesi keamanan/], [404, 'HTTP_ERROR', /belum tersedia/], [422, 'VALIDATION_ERROR', /tidak valid/], [429, 'RATE_LIMITED', /Terlalu banyak/], [500, 'HTTP_ERROR', /belum dapat dipastikan/]]) {
  test(`candidate load ${code}/${status} is safe and does not claim`, async () => {
    const h = await harness({ candidates: async () => { throw { status, code, message: 'private secret' }; } });
    assert.match(h.get('[data-recovery-status]').textContent, message); assert.equal(h.claims(), 0);
    if (status === 429 || code === 'EMAIL_VERIFICATION_REQUIRED') assert.equal(h.get('[data-recovery-retry]').disabled, true);
    h.events.pagehide();
  });
}

test('empty candidates and pagination retain email management alternative without auto mutation', async () => {
  const offsets = []; const h = await harness({ candidates: async offset => { offsets.push(offset); return { items: [], limit: 20, offset, hasMore: offset === 0 }; } });
  assert.match(h.get('[data-recovery-status]').textContent, /Tidak ada kandidat/);
  const next = h.get('[data-recovery-next]'); next.hasAttribute = name => name === 'data-recovery-next';
  await h.click(next); assert.deepEqual(offsets, [0, 20]); assert.equal(h.claims(), 0);
});

for (const code of ['STARTER_ALREADY_OWNED', 'PLAN_LIMIT_REACHED', 'STARTER_NOT_ELIGIBLE']) {
  test(`${code} rereads dashboard/candidates and does not retry claim`, async () => {
    const h = await harness({ claim: async () => { throw { status: code === 'STARTER_NOT_ELIGIBLE' ? 404 : 409, code }; } });
    await h.click(h.button()); assert.equal(h.claims(), 1); assert.equal(h.reads(), 2); assert.equal(h.candidateReads(), 2);
    assert.match(h.get('[data-recovery-status]').textContent, /tidak lagi|akun lain|sudah memiliki/);
  });
}

test('ambiguous claim has no automatic POST retry and reports uncertainty', async () => {
  const h = await harness({ claim: async () => { throw { code: 'REQUEST_TIMEOUT' }; } });
  await h.click(h.button()); assert.equal(h.claims(), 1); assert.match(h.get('[data-recovery-status]').textContent, /belum dapat dipastikan/);
});

test('claim response rejects malformed, wrong-card and unsuccessful envelopes', async () => {
  for (const response of [{ success: false, data: { card: item, alreadyOwned: false } }, { success: true, data: {} }, { success: true, data: { card: { ...item, publicId: 'missing' }, alreadyOwned: true } }]) {
    await assert.rejects(service({ synchronizeAccessCsrf: async () => {}, post: async () => response }).claimCandidate(id), { code: 'STARTER_RECOVERY_INVALID' });
  }
});
