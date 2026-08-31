import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ApiClient } from '../services/api-client.js';
import { buildStarterInput, validateStarterCreateValues, validateStarterInput } from '../validators/starter-validator.js';
import { validateLogin, validateRegister, validateResetPassword, validateVerifyOtp } from '../validators/auth-validator.js';
import { normalizeWebsiteUrl } from '../utils/website-url.js';
import { authErrorMessage, safeMembershipIntent, starterPublicIdFromReturnTo, withAuthContext } from '../utils/auth-flow.js';

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

test('Starter update uses account CSRF while the link-based claim uses Starter CSRF', async () => {
  const csrfHeaders = [];
  const client = new ApiClient({
    baseUrl: 'https://example.test/api/v1',
    cookieSource: () => 'csrf_token=access-csrf; starter_csrf_token=starter-csrf',
    fetchImpl: async (_url, options) => {
      csrfHeaders.push(options.headers.get('x-csrf-token'));
      return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
    },
  });

  await client.put('/starter/cards/card-id', { contact: {} }, { csrfContext: 'access' });
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

test('Starter create combines required first and last names into the fullName API contract', async () => {
  const values = {
    firstName: ' Begitu ',
    lastName: ' Indah, SE ',
    email: 'begitu@example.com',
    websiteUrl: 'https://example.com',
  };
  const input = buildStarterInput(values);

  assert.equal(input.contact.fullName, 'Begitu Indah, SE');
  assert.deepEqual(validateStarterCreateValues(values), {});
  assert.equal(validateStarterCreateValues({ ...values, firstName: '' }).firstName, 'Nama depan wajib diisi.');
  assert.equal(validateStarterCreateValues({ ...values, lastName: '' }).lastName, 'Nama belakang wajib diisi.');

  const page = await readFile(new URL('../create/index.html', import.meta.url), 'utf8');
  assert.match(page, /name="firstName"[^>]*autocomplete="given-name"[^>]*required/);
  assert.match(page, /name="lastName"[^>]*autocomplete="family-name"[^>]*required/);
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

test('Starter management page has account-only actions and no anonymous edit controls', async () => {
  const page = await readFile(new URL('../starter/manage/index.html', import.meta.url), 'utf8');
  assert.match(page, /data-starter-login/);
  assert.match(page, /data-starter-signup/);
  assert.doesNotMatch(page, /Simpan perubahan|Claim ke akun login|data-starter-manage-form/);
  assert.equal(authErrorMessage({ code: 'INTERNAL_SERVER_ERROR' }), 'Layanan sedang mengalami kendala. Coba lagi beberapa menit lagi.');
});
