import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { clearFieldErrors, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../components/forms/form-utils.js';
import { ApiClient } from '../services/api-client.js';
import { buildStarterInput, validateStarterCreateValues, validateStarterInput } from '../validators/starter-validator.js';
import { normalizeEmail, validateEmail, validateLogin, validateRegister, validateResetPassword, validateVerifyOtp } from '../validators/auth-validator.js';
import { normalizeWebsiteUrl } from '../utils/website-url.js';
import {
  authErrorMessage,
  forgetStarterClaim,
  pendingStarterClaim,
  postLoginDestination,
  rememberStarterClaim,
  safeMembershipIntent,
  safeReturnTo,
  starterPublicIdFromReturnTo,
  withAuthContext,
} from '../utils/auth-flow.js';

test('public auth and Starter create POST can opt out of CSRF header', async () => {
  const observed = [];
  const client = new ApiClient({
    baseUrl: 'https://example.test/api/v1',
    cookieSource: () => 'csrf_token=access-csrf; starter_csrf_token=starter-csrf',
    fetchImpl: async (url, options) => {
      observed.push({ url, csrf: options.headers.get('x-csrf-token') });
      return new Response(JSON.stringify({ success: true, data: null }), { status: 200 });
    },
  });

  await client.post('/auth/login', { email: 'a@example.com', password: 'password' }, { csrfContext: null, skipRefresh: true });
  await client.post('/starter/cards', { contact: {} }, { csrfContext: null, skipRefresh: true });

  assert.deepEqual(observed.map((item) => item.csrf), [null, null]);
});

test('claimed Starter updates use normal cards/account CSRF; legacy claim context remains transport-only', async () => {
  const csrfHeaders = [];
  const client = new ApiClient({
    baseUrl: 'https://example.test/api/v1',
    cookieSource: () => 'csrf_token=access-csrf; starter_csrf_token=starter-csrf',
    fetchImpl: async (_url, options) => {
      csrfHeaders.push(options.headers.get('x-csrf-token'));
      return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
    },
  });

  await client.put('/cards/card-id', { contact: {} }, { csrfContext: 'access' });
  await client.post('/starter/cards/card-id/claim', null, { csrfContext: 'starter' });

  assert.deepEqual(csrfHeaders, ['access-csrf', 'starter-csrf']);
});

test('auth validators mirror backend-facing minimum contract', () => {
  assert.deepEqual(validateRegister({ email: ' USER@Example.COM ', password: '12345678' }), {});
  assert.equal(validateRegister({ email: 'bad', password: '123' }).email, 'Format email belum valid.');
  assert.equal(validateLogin({ email: 'me@example.com', password: '' }).password, 'Password wajib diisi.');
  assert.deepEqual(validateVerifyOtp({ email: 'me@example.com', code: '123456' }), {});
  assert.equal(validateVerifyOtp({ email: 'me@example.com', code: 'abc' }).code, 'Kode OTP harus 6 digit.');
  assert.equal(validateResetPassword({ token: 'short', password: '12345678' }).token, 'Token reset tidak valid.');
});

test('Starter validator builds strict backend contact payload', () => {
  const input = buildStarterInput({
    fullName: ' Arwan ',
    jobTitle: 'Owner',
    organization: 'KND',
    officePhone: '',
    mobilePhone: '08123',
    email: ' OWNER@EXAMPLE.COM ',
    websiteUrl: 'https://example.com',
    addressText: 'Jakarta',
  });

  assert.equal(input.contact.fullName, 'Arwan');
  assert.equal(input.contact.email, 'owner@example.com');
  assert.equal(buildStarterInput({ fullName: 'Arwan', email: 'owner@example.com', websiteUrl: 'example.com' }, 'en').locale, 'id');
  assert.deepEqual(validateStarterInput(input), {});
  assert.equal(validateStarterInput(buildStarterInput({ fullName: '', email: 'bad', websiteUrl: 'ftp://bad.test' })).fullName, 'Nama wajib diisi.');
});

test('website input accepts a bare domain and prevents duplicated protocols', () => {
  assert.equal(normalizeWebsiteUrl('detik.com'), 'https://detik.com');
  assert.equal(normalizeWebsiteUrl('https://detik.com'), 'https://detik.com');
  assert.equal(normalizeWebsiteUrl('http://https://detik.com'), 'https://detik.com');
  assert.equal(normalizeWebsiteUrl('ftp://detik.com'), 'ftp://detik.com');
  assert.equal(buildStarterInput({ fullName: 'A', email: 'a@example.com', websiteUrl: 'detik.com' }).contact.websiteUrl, 'https://detik.com');
  assert.deepEqual(validateStarterInput(buildStarterInput({ fullName: 'A', email: 'a@example.com', websiteUrl: 'detik.com' })), {});
});

test('Starter create combines optional prefix and last name into the fullName API contract', async () => {
  const values = {
    namePrefix: 'Ms',
    firstName: ' Begitu ',
    lastName: '',
    email: 'begitu@example.com',
    websiteUrl: '',
  };
  const input = buildStarterInput(values);

  assert.equal(input.contact.fullName, 'Ms Begitu');
  assert.equal(input.contact.websiteUrl, '');
  assert.deepEqual(validateStarterCreateValues(values), {});
  assert.equal(validateStarterCreateValues({ ...values, firstName: '' }).firstName, 'Nama depan wajib diisi.');
  assert.equal(validateStarterCreateValues({ ...values, namePrefix: 'Dr' }).namePrefix, 'Sapaan tidak valid.');

  const page = await readFile(new URL('../create/index.html', import.meta.url), 'utf8');
  assert.match(page, /name="namePrefix"[^>]*autocomplete="honorific-prefix"/);
  assert.match(page, /name="firstName"[^>]*autocomplete="given-name"[^>]*required/);
  assert.match(page, /name="lastName"[^>]*autocomplete="family-name"/);
  assert.doesNotMatch(page, /name="lastName"[^>]*required/);
  assert.doesNotMatch(page, /name="websiteUrl"[^>]*required/);
  assert.ok(page.includes('>Nomor handphone</label>'));
  assert.match(page, />Organisasi \/ Perusahaan<\/label>/);
  assert.doesNotMatch(page, /name="fullName"/);
});

test('Starter handoff and membership intent preserve only safe navigation context', () => {
  const returnTo = '/starter/manage/?publicId=3d2f31a4-7c83-47e1-b938-d5c1c7e7d160';
  assert.equal(starterPublicIdFromReturnTo(returnTo), '3d2f31a4-7c83-47e1-b938-d5c1c7e7d160');
  assert.equal(starterPublicIdFromReturnTo('/starter/manage/?publicId=not-a-card-id'), '');
  assert.equal(starterPublicIdFromReturnTo('https://unsafe.example/'), '');
  assert.equal(withAuthContext('/login/', { returnTo, intent: 'basic' }), `/login/?returnTo=${encodeURIComponent(returnTo)}&intent=basic`);
  assert.equal(safeMembershipIntent('pro'), 'pro');
  assert.equal(safeMembershipIntent('enterprise'), '');
});

test('Starter claim session storage keeps only a validated public ID navigation context', () => {
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const stored = new Map();
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key) => stored.get(key) ?? null,
      setItem: (key, value) => stored.set(key, value),
      removeItem: (key) => stored.delete(key),
    },
  });

  try {
    rememberStarterClaim('opaque-edit-token');
    assert.equal(stored.size, 0);

    const publicId = '3d2f31a4-7c83-47e1-b938-d5c1c7e7d160';
    rememberStarterClaim(publicId);
    assert.deepEqual([...stored], [['knd.pendingStarterClaim', publicId]]);
    assert.equal(pendingStarterClaim(), publicId);

    stored.set('knd.pendingStarterClaim', 'opaque-edit-token');
    assert.equal(pendingStarterClaim(), '');
    forgetStarterClaim();
    assert.equal(stored.size, 0);
  } finally {
    if (originalStorage) Object.defineProperty(globalThis, 'sessionStorage', originalStorage);
    else delete globalThis.sessionStorage;
  }
});

test('Starter management page directs new users to signup without an initial login choice', async () => {
  const page = await readFile(new URL('../starter/manage/index.html', import.meta.url), 'utf8');
  assert.match(page, /Menyiapkan pendaftaran akun/);
  assert.doesNotMatch(page, /data-starter-login|data-starter-signup|Login atau buat akun/);
  assert.doesNotMatch(page, /Simpan perubahan|Claim ke akun login|data-starter-manage-form/);
  assert.equal(authErrorMessage({ code: 'INTERNAL_SERVER_ERROR' }), 'Layanan sedang mengalami kendala. Coba lagi beberapa menit lagi.');
});

function authNode() {
  const attrs = new Map(); const listeners = new Map();
  return { value: '', hidden: false, disabled: false, textContent: '', dataset: {}, children: [],
    setAttribute(name, value) { attrs.set(name, String(value)); if (name === 'hidden') this.hidden = true; },
    getAttribute: name => attrs.get(name) ?? null,
    removeAttribute(name) { attrs.delete(name); if (name === 'hidden') this.hidden = false; },
    addEventListener: (name, handler) => listeners.set(name, handler),
    emit: (name, event = {}) => listeners.get(name)?.(event),
    focus() { this.focused = true; }, before() {}, after(node) { this.children.push(node); },
    replaceChildren(...nodes) { this.children = nodes; } };
}
async function authHarness(kind, options = {}) {
  const source = await readFile(new URL(`../pages/auth/${kind}.js`, import.meta.url), 'utf8');
  const nodes = new Map(); const calls = []; let contextReads = 0; let forgot = 0;
  const get = selector => { if (!nodes.has(selector)) nodes.set(selector, authNode()); return nodes.get(selector); };
  const selector = kind === 'login' ? '[data-login-form]' : kind === 'register' ? '[data-register-form]' : '[data-verify-form]';
  const form = get(selector); const fields = kind === 'verify-email' ? ['email', 'code'] : ['email', 'password'];
  form.elements = Object.fromEntries(fields.map(field => [field, authNode()]));
  form.elements.email.value = 'fixture@example.test';
  if (form.elements.password) form.elements.password.value = 'dummy-password';
  if (form.elements.code) form.elements.code.value = '123456';
  form.querySelector = get;
  form.querySelectorAll = selector => selector === '[data-field-error]' || selector === '[aria-invalid="true"]'
    ? [] : [...Object.values(form.elements), get('button[type="submit"]'), ...(kind === 'verify-email' ? [get('[data-resend-otp]')] : [])];
  get('[data-starter-identity-support]').hidden = true;
  const sandbox = { URL, URLSearchParams, document: { querySelector: get, createElement: authNode, createTextNode: text => ({ textContent: text }) },
    location: { search: options.search ?? '', origin: 'https://fixture.invalid', assign: path => { sandbox.destination = path; } },
    authService: Object.fromEntries(['login', 'register', 'verifyEmailOtp', 'resendEmailOtp'].map(method => [method, async input => {
      calls.push({ method, input }); return options.auth ? options.auth(method, input) : { user: { roles: options.roles ?? ['member'] } };
    }])),
    starterService: { signupContext: async () => { contextReads++; return options.context ? options.context() : { email: 'fixture@example.test' }; },
      claim: () => assert.fail('login/OTP must not claim'), claimCandidate: () => assert.fail('login/OTP must not claim') },
    cardService: { list: () => assert.fail('login does not resolve ownership by mutation/fallback') },
    normalizeEmail, validateLogin, validateRegister, validateVerifyOtp, validateEmail,
    clearFieldErrors, formValues: () => Object.fromEntries(fields.map(field => [field, form.elements[field].value])),
    mapApiFieldErrors, setBusy, showFieldErrors, showStatus,
    authErrorMessage, forgetStarterClaim: () => forgot++, pendingStarterClaim: () => options.pending ?? '',
    postLoginDestination, safeMembershipIntent, safeReturnTo, starterPublicIdFromReturnTo, withAuthContext,
    setInterval: () => 1, clearInterval() {} };
  runInNewContext(source.replace(/^import .*;\r?\n/gm, ''), sandbox);
  await new Promise(resolve => setImmediate(resolve));
  return { get, form, calls, sandbox, contextReads: () => contextReads, forgot: () => forgot,
    submit: () => form.emit('submit', { preventDefault() {} }), resend: () => get('[data-resend-otp]').emit('click') };
}
test('Starter login uses only authentication then dashboard; claim selection/confirmation is separate', async () => {
  const h = await authHarness('login', { pending: '3d2f31a4-7c83-47e1-b938-d5c1c7e7d160' });
  const first = h.submit(); await h.submit(); await first;
  assert.deepEqual(h.calls.map(call => call.method), ['login']);
  assert.equal(h.sandbox.destination, '/app/'); assert.equal(h.forgot(), 1);
});
test('non-Starter login preserves role, membership intent and safe return destinations', async () => {
  for (const [options, target] of [[{ roles: ['super_admin'] }, '/admin/'],
    [{ search: '?intent=basic' }, '/app/billing/?intent=basic'],
    [{ search: '?returnTo=%2Fapp%2Faccount%2F' }, '/app/account/']]) {
    const h = await authHarness('login', options); await h.submit(); assert.equal(h.sandbox.destination, target);
  }
});
for (const kind of ['register', 'verify-email']) {
  test(`${kind}: valid legacy context review goes to support, never invalid-cookie copy or auth/email mutation`, async () => {
    const h = await authHarness(kind, { pending: '3d2f31a4-7c83-47e1-b938-d5c1c7e7d160',
      context: async () => { throw { status: 409, code: 'CARD_EMAIL_IDENTITY_REVIEW_REQUIRED', message: 'private diagnostic' }; } });
    assert.match(h.get('[data-form-status]').textContent, /peninjauan.*support/);
    assert.doesNotMatch(h.get('[data-form-status]').textContent, /kedaluwarsa|tidak valid|private diagnostic/);
    assert.equal(h.get('[data-starter-identity-support]').hidden, false);
    assert.equal(h.get('button[type="submit"]').disabled, true);
    await h.submit(); if (kind === 'verify-email') await h.resend();
    assert.equal(h.calls.length, 0); assert.equal(h.contextReads(), 1); assert.equal(h.sandbox.destination, undefined);
  });
  test(`${kind}: real invalid-management 401 remains distinct from identity review`, async () => {
    const h = await authHarness(kind, { pending: '3d2f31a4-7c83-47e1-b938-d5c1c7e7d160',
      context: async () => { throw { status: 401, code: 'STARTER_TOKEN_INVALID' }; } });
    assert.equal(h.get('[data-starter-identity-support]').hidden, true);
    assert.doesNotMatch(h.get('[data-form-status]').textContent, /peninjauan/);
    await h.submit(); assert.equal(h.calls.length, 0);
  });
  test(`${kind}: proven Starter context permits explicit auth operation but never claims automatically`, async () => {
    const h = await authHarness(kind, { pending: '3d2f31a4-7c83-47e1-b938-d5c1c7e7d160' });
    assert.equal(h.calls.length, 0); await h.submit();
    assert.deepEqual(h.calls.map(call => call.method), [kind === 'register' ? 'register' : 'verifyEmailOtp']);
    assert.match(h.sandbox.destination, kind === 'register' ? /^\/verify-email\// : /^\/login\//);
    assert.doesNotMatch(h.sandbox.destination, /email=/);
  });
}
test('post-claim edits use cardService /cards with fresh account CSRF, never deprecated Starter PUT', async () => {
  const source = await readFile(new URL('../services/card-service.js', import.meta.url), 'utf8');
  const observed = [];
  const client = new ApiClient({ baseUrl: 'https://fixture.invalid/api/v1', cookieSource: () => 'csrf_token=stale', fetchImpl: async (url, options) => {
    observed.push({ url, options });
    return Response.json({ success: true, data: url.endsWith('/csrf') ? { csrfToken: 'fresh' } : { publicId: 'owned' } });
  } });
  const adapter = runInNewContext(source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + '\ncardService;', { api: client, URLSearchParams });
  await adapter.update('owned', { contact: { fullName: 'Owned' } });
  assert.equal(observed.length, 2); assert.equal(observed[1].url, 'https://fixture.invalid/api/v1/cards/owned');
  assert.equal(observed[1].options.method, 'PUT'); assert.equal(observed[1].options.credentials, 'include');
  assert.equal(observed[1].options.headers.get('X-CSRF-Token'), 'fresh');
  const starter = await readFile(new URL('../services/starter-service.js', import.meta.url), 'utf8');
  const starterAdapter = runInNewContext(starter.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') + '\nstarterService;', { api: client });
  assert.equal(starterAdapter.update, undefined); assert.equal(starterAdapter.claim, undefined);
});
