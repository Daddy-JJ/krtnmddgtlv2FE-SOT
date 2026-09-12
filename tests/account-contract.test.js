import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { ApiClient } from '../services/api-client.js';
import { validateEmail, validateForgotPassword, validateVerifyOtp } from '../validators/auth-validator.js';

const root = new URL('../', import.meta.url);

test('account email/reset public auth requests omit CSRF and logout uses access CSRF', async () => {
  const requests = [];
  const client = new ApiClient({
    baseUrl: 'https://example.test/api/v1',
    cookieSource: () => 'csrf_token=access-csrf',
    fetchImpl: async (url, options) => {
      requests.push({ url, csrf: options.headers.get('x-csrf-token'), body: options.body ? JSON.parse(options.body) : null });
      return new Response(JSON.stringify({ success: true, data: null }), { status: 200 });
    },
  });

  await client.post('/auth/email/verify-otp', { email: 'me@example.com', code: '123456' }, { csrfContext: null, skipRefresh: true });
  await client.post('/auth/email/resend-otp', { email: 'me@example.com' }, { csrfContext: null, skipRefresh: true });
  await client.post('/auth/forgot-password', { email: 'me@example.com' }, { csrfContext: null, skipRefresh: true });
  await client.post('/auth/logout', null, { csrfContext: 'access', skipRefresh: true });

  assert.deepEqual(requests.map((request) => request.csrf), [null, null, null, 'access-csrf']);
  assert.equal(requests[0].body.code, '123456');
});

test('account validators cover email verification and reset forms', () => {
  assert.equal(validateEmail(' user@example.com '), '');
  assert.deepEqual(validateVerifyOtp({ email: 'user@example.com', code: '123456' }), {});
  assert.equal(validateVerifyOtp({ email: 'bad', code: '12' }).code, 'Kode OTP harus 6 digit.');
  assert.deepEqual(validateForgotPassword({ email: 'user@example.com' }), {});
});

test('account page exposes only reset password and locks delivery to the current account email', async () => {
  const [page, controller] = await Promise.all([
    readFile(new URL('app/account/index.html', root), 'utf8'),
    readFile(new URL('pages/app/account.js', root), 'utf8'),
  ]);

  assert.doesNotMatch(page, /Status email|data-account-verification-panel|data-account-verified|data-account-verify-form|data-account-resend/);
  assert.match(page, /Reset password/i);
  assert.match(page, /id="reset-email"[^>]*readonly[^>]*aria-readonly="true"/);
  assert.match(page, /data-account-reset-submit disabled/);
  assert.match(controller, /await authService\.current\(\)/);
  assert.match(controller, /resetForm\.elements\.email\.value = email/);
  assert.doesNotMatch(controller, /verifyEmailOtp|resendEmailOtp|validateVerifyOtp|verifyForm|verifiedState/);
  assert.doesNotMatch(controller, /Data email akun tidak tersedia\./);
});
