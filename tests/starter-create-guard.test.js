import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { ApiClient } from '../services/api-client.js';
import { buildStarterInput, validateStarterCreateValues } from '../validators/starter-validator.js';
import { clearFieldErrors, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../components/forms/form-utils.js';
import { bindWebsiteUrlInput } from '../utils/website-url.js';
import { apiErrorMessage } from '../utils/api-error-message.js';
import { safeHttpUrl } from '../utils/safe-url.js';

const source = await readFile(new URL('../services/starter-service.js', import.meta.url), 'utf8');
const page = await readFile(new URL('../pages/starter/create.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../create/index.html', import.meta.url), 'utf8');
const id = '3d2f31a4-7c83-47e1-b938-d5c1c7e7d160';
const card = { publicId: id, slug: 'AbcDefg', planCode: 'starter', status: 'published', canonicalUrl: 'https://example.test/AbcDefg', emailSent: true };
const service = api => runInNewContext(source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + '\nstarterService;', { api, URL });

test('anonymous create uses the existing credentialed API without CSRF/refresh/preflight auth', async () => {
  const calls = [];
  const api = new ApiClient({ baseUrl: 'https://fixture.invalid/api/v1', cookieSource: () => 'csrf_token=unrelated', fetchImpl: async (url, options) => {
    calls.push({ url, options }); return Response.json({ success: true, data: { ...card, contact: { email: 'private@example.test' }, token: 'not-for-page' } }, { status: 201 });
  } });
  const controller = new AbortController();
  const input = buildStarterInput({ firstName: 'Nama', email: ' Person.Name+tag@Example.test ' });
  const result = await service(api).create(input, { signal: controller.signal });
  assert.equal(calls.length, 1); assert.equal(calls[0].url, 'https://fixture.invalid/api/v1/starter/cards');
  assert.equal(calls[0].options.credentials, 'include'); assert.equal(calls[0].options.headers.has('X-CSRF-Token'), false);
  assert.equal(JSON.parse(calls[0].options.body).contact.email, 'person.name+tag@example.test');
  assert.deepEqual(Object.keys(result), ['publicId', 'slug', 'canonicalUrl', 'emailSent']);
});
test('published card stays a success even when email delivery is false or unknown', async () => {
  for (const emailSent of [true, false, undefined, 'true']) {
    const result = await service({ post: async () => ({ success: true, data: { ...card, emailSent } }) }).create({});
    assert.equal(result.emailSent, emailSent === true);
  }
});
test('malformed/unsuccessful card envelopes and hostile/mismatched URLs fail closed', async () => {
  for (const response of [null, {}, { success: false, data: card }, { success: true, data: null },
    ...[{ publicId: 'guess' }, { slug: 'lower-case' }, { status: 'draft' }, { planCode: 'pro' },
      { canonicalUrl: 'javascript:alert(1)' }, { canonicalUrl: 'https://user:pass@example.test/AbcDefg' },
      { canonicalUrl: 'https://example.test/Another' }, { canonicalUrl: 'https://example.test/AbcDefg?token=secret' },
      { canonicalUrl: 'https://example.test/AbcDefg#token' }].map(change => ({ success: true, data: { ...card, ...change } }))]) {
    await assert.rejects(service({ post: async () => response }).create({}), { code: 'STARTER_CREATE_INVALID' });
  }
});
for (const [status, code] of [[401, 'AUTH_REQUIRED'], [403, 'CSRF_INVALID'], [409, 'STARTER_EMAIL_ALREADY_EXISTS'], [409, 'CARD_EMAIL_IDENTITY_REVIEW_REQUIRED'], [422, 'VALIDATION_ERROR'], [429, 'RATE_LIMITED'], [503, 'SERVICE_UNAVAILABLE']]) {
  test(`create ${status}/${code} never replays POST or refreshes authentication`, async () => {
    const paths = [];
    const api = new ApiClient({ baseUrl: 'https://fixture.invalid/api/v1', cookieSource: () => '', fetchImpl: async url => {
      paths.push(url); return Response.json({ success: false, code }, { status });
    } });
    await assert.rejects(service(api).create({}), { status, code });
    assert.deepEqual(paths, ['https://fixture.invalid/api/v1/starter/cards']);
  });
}
test('network failure produces one POST, not a new creation attempt', async () => {
  let calls = 0;
  const api = new ApiClient({ baseUrl: 'https://fixture.invalid/api/v1', fetchImpl: async () => { calls++; throw new TypeError('connection lost'); } });
  await assert.rejects(service(api).create({}), { code: 'NETWORK_ERROR' }); assert.equal(calls, 1);
});

function node() {
  const attrs = new Map(); const events = new Map();
  return { value: '', hidden: false, disabled: false, textContent: '', dataset: {}, id: '',
    setAttribute: (name, value) => attrs.set(name, String(value)), getAttribute: name => attrs.get(name) ?? null,
    removeAttribute: name => attrs.delete(name), focus() { this.focused = true; },
    addEventListener: (name, listener) => events.set(name, listener), removeEventListener: name => events.delete(name),
    emit(name, event = {}) { return events.get(name)?.(event); } };
}
function harness(create = async () => card) {
  const nodes = new Map(); const fields = new Map(); const errors = new Map(); const timers = new Map(); const events = {};
  let now = 1_000_000; let calls = 0; let signal; let reloads = 0; let seq = 0;
  const get = selector => { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); };
  const form = get('[data-starter-create-form]'); const button = get('[type="submit"]');
  const values = { firstName: 'Nama', lastName: '', namePrefix: '', jobTitle: '', organization: '', officePhone: '', mobilePhone: '', email: ' Person.Name+tag@Example.test ', websiteUrl: '', addressText: '' };
  form.elements = {};
  for (const [name, value] of Object.entries(values)) { const input = node(); input.value = value; fields.set(name, input); form.elements[name] = input; errors.set(name, node()); }
  form.querySelector = selector => selector.startsWith('[data-field-error=') ? errors.get(selector.match(/"([^"]+)"/)[1]) : get(selector);
  form.querySelectorAll = selector => selector === '[data-field-error]' ? [...errors.values()]
    : selector === '[aria-invalid="true"]' ? [...fields.values()].filter(field => field.getAttribute('aria-invalid') === 'true')
    : [...fields.values(), button];
  get('[data-starter-result]').hidden = true;
  get('[data-starter-result]').querySelector = () => get('h2');
  get('[data-starter-create-recovery]').hidden = true;
  const sandbox = { AbortController, Date: { now: () => now }, String, Number, Math, Set,
    document: { querySelector: get, documentElement: { lang: 'id' } },
    addEventListener: (name, fn) => { events[name] = fn; }, location: { reload: () => reloads++ },
    setInterval: fn => { const id = ++seq; timers.set(id, fn); return id; }, clearInterval: id => timers.delete(id),
    starterService: { create: async (input, options) => { calls++; signal = options.signal; return create(input, options); } },
    formValues: () => Object.fromEntries([...fields].map(([key, field]) => [key, field.value])),
    buildStarterInput, validateStarterCreateValues, clearFieldErrors, mapApiFieldErrors, setBusy, showFieldErrors, showStatus, bindWebsiteUrlInput, apiErrorMessage, safeHttpUrl,
  };
  runInNewContext(page.replace(/^import .*;\r?\n/gm, ''), sandbox);
  return { get, form, fields, errors, button, timers, events, calls: () => calls, signal: () => signal, reloads: () => reloads,
    submit: () => form.emit('submit', { preventDefault() {} }),
    email(value) { fields.get('email').value = value; fields.get('email').emit('input'); },
    advance(ms) { now += ms; [...timers.values()].forEach(fn => fn()); } };
}
test('rapid clicks/Enter/programmatic submissions share a synchronous in-flight guard', async () => {
  let finish;
  const h = harness(() => new Promise(resolve => { finish = resolve; }));
  const first = h.submit(); await h.submit(); await h.submit();
  assert.equal(h.calls(), 1); assert.equal(h.button.disabled, true);
  assert.equal(h.form.getAttribute('aria-busy'), 'true');
  finish(card); await first; await h.submit();
  assert.equal(h.calls(), 1); assert.equal(h.button.disabled, true); assert.equal(h.form.getAttribute('aria-busy'), 'false');
  assert.equal(h.get('[data-starter-result]').hidden, false); assert.equal(h.get('h2').focused, true);
});
test('email delivery failure keeps publication/result and never re-enables a second create', async () => {
  const h = harness(async () => ({ ...card, emailSent: false }));
  await h.submit(); h.email('different@example.test'); await h.submit();
  assert.equal(h.calls(), 1); assert.equal(h.get('[data-starter-result]').hidden, false);
  assert.match(h.get('[data-form-status]').textContent, /Kartu berhasil dibuat, tetapi email/);
  assert.match(h.get('[data-starter-manage-link]').href, new RegExp(id));
});
test('exact duplicate conflict offers safe login/recovery, not a card URL or auto claim', async () => {
  const h = harness(async () => { throw { status: 409, code: 'STARTER_EMAIL_ALREADY_EXISTS', message: 'private server secret', details: { publicId: id, canonicalUrl: 'https://evil.test', token: 'secret' } }; });
  await h.submit(); await h.submit();
  assert.equal(h.calls(), 1); assert.equal(h.button.disabled, true); assert.equal(h.get('[data-starter-create-recovery]').hidden, false);
  assert.match(h.get('[data-form-status]').textContent, /Masuk.*kartu yang sudah ada/);
  assert.doesNotMatch(h.get('[data-form-status]').textContent, /secret|evil/);
  assert.equal(h.get('[data-starter-result]').hidden, true);
  h.email('person.name+tag@EXAMPLE.test '); await h.submit(); assert.equal(h.calls(), 1);
  h.email('corrected@example.test'); assert.equal(h.button.disabled, false);
  h.email('person.name+tag@example.test'); await h.submit(); assert.equal(h.calls(), 1);
});
test('an email typo can be corrected after an explicit duplicate rejection', async () => {
  let attempt = 0;
  const h = harness(async () => { if (++attempt === 1) throw { status: 409, code: 'STARTER_EMAIL_ALREADY_EXISTS' }; return card; });
  await h.submit(); h.email('corrected@example.test'); await h.submit();
  assert.equal(h.calls(), 2); assert.equal(h.get('[data-starter-result]').hidden, false);
});
test('identity review blocks further create and exposes support, without login/retry or invalid-cookie claims', async () => {
  const h = harness(async () => { throw { status: 409, code: 'CARD_EMAIL_IDENTITY_REVIEW_REQUIRED', message: 'private' }; });
  await h.submit(); h.email('another@example.test'); await h.submit();
  assert.equal(h.calls(), 1); assert.equal(h.button.disabled, true);
  assert.equal(h.get('[data-starter-create-recovery]').hidden, false);
  assert.equal(h.get('[data-starter-recovery-login]').hidden, true);
  assert.equal(h.get('[data-starter-recovery-instructions]').hidden, true);
  assert.match(h.get('[data-form-status]').textContent, /peninjauan.*support/);
  assert.doesNotMatch(h.get('[data-form-status]').textContent, /cookie|kedaluwarsa|private/);
});
test('account-registration conflict is not interpreted as a duplicate card', async () => {
  const h = harness(async () => { throw { status: 409, code: 'EMAIL_ALREADY_EXISTS' }; });
  await h.submit(); assert.equal(h.button.disabled, false); assert.equal(h.get('[data-starter-create-recovery]').hidden, true);
});
test('client validation sends no request; safe 422 field errors preserve input and allow an explicit retry', async () => {
  let attempt = 0;
  const h = harness(async () => { if (++attempt === 1) throw { status: 422, code: 'VALIDATION_ERROR', message: 'private', details: [null, { field: 'contact.fullName', message: 'SQL private' }, { field: '"malformed', message: 'secret' }] }; return card; });
  h.fields.get('firstName').value = '   '; await h.submit(); assert.equal(h.calls(), 0);
  h.fields.get('firstName').value = 'Nama'; await h.submit(); assert.equal(h.calls(), 1); assert.equal(h.button.disabled, false);
  assert.equal(h.errors.get('firstName').textContent, 'Periksa isian ini.'); assert.equal(h.fields.get('firstName').value, 'Nama');
  assert.doesNotMatch(h.get('[data-form-status]').textContent, /private|SQL/);
  await h.submit(); assert.equal(h.calls(), 2);
});
for (const error of [{ code: 'REQUEST_TIMEOUT' }, { code: 'NETWORK_ERROR' }, { status: 502 }, { code: 'STARTER_CREATE_INVALID' }]) {
  test(`ambiguous ${error.code ?? error.status} locks new submissions, preserves input and exposes recovery`, async () => {
    const h = harness(async () => { throw { ...error, message: 'private', requestId: 'fixture-request' }; });
    await h.submit(); h.email('other@example.test'); await h.submit();
    assert.equal(h.calls(), 1); assert.equal(h.button.disabled, true); assert.equal(h.form.getAttribute('aria-busy'), 'false');
    assert.equal(h.get('[data-starter-result]').hidden, true); assert.equal(h.get('[data-starter-create-recovery]').hidden, false);
    assert.match(h.get('[data-form-status]').textContent, /belum dapat dipastikan.*fixture-request/);
    assert.equal(h.fields.get('firstName').value, 'Nama');
  });
}
test('429 honors the deadline, does not announce every tick or automatically retry; pagehide cleans timers', async () => {
  const h = harness(async () => { throw { status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 45 }; });
  await h.submit(); const message = h.get('[data-form-status]').textContent;
  h.advance(44000); await h.submit(); assert.equal(h.calls(), 1); assert.equal(h.button.disabled, true);
  h.advance(1000); assert.equal(h.calls(), 1); assert.equal(h.button.disabled, false); assert.equal(h.timers.size, 0);
  assert.equal(h.get('[data-form-status]').textContent, message);
  await h.submit(); assert.equal(h.timers.size, 1); h.events.pagehide(); assert.equal(h.timers.size, 0);
});
test('missing/malformed Retry-After uses a 30-second UX pause', async () => {
  for (const retryAfterSeconds of [undefined, null, NaN, -1, '30', Number.MAX_SAFE_INTEGER]) {
    const h = harness(async () => { throw { status: 429, code: 'RATE_LIMITED', retryAfterSeconds }; });
    await h.submit(); h.advance(29000); assert.equal(h.button.disabled, true);
    h.advance(1000); assert.equal(h.button.disabled, false); assert.equal(h.calls(), 1);
  }
});
test('page leave aborts and ignores late success; bfcache restoration reloads rather than resubmitting', async () => {
  let finish; const h = harness(() => new Promise(resolve => { finish = resolve; }));
  const pending = h.submit(); h.events.pagehide(); finish(card); await pending;
  assert.equal(h.signal().aborted, true); assert.equal(h.get('[data-starter-result]').hidden, true);
  h.events.pageshow({ persisted: true }); assert.equal(h.reloads(), 1); assert.equal(h.calls(), 1);
});
test('recovery uses fixed authenticated navigation, no email lookup/storage or guest ownership disclosure', () => {
  assert.match(html, /href="\/login\/\?returnTo=%2Fapp%2F"/);
  assert.match(html, /Verifikasi email diperlukan saat mengelola, bukan sebelum kartu pertama terbit/);
  assert.doesNotMatch(page, /localStorage|sessionStorage|console\.|innerHTML|location\.search|claimCandidate\(|openAccess\(/);
});
