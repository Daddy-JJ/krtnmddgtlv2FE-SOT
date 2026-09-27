import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  clearForgotPasswordCooldown,
  cooldownSecondsRemaining,
  formatCooldown,
  readForgotPasswordCooldownUntil,
  startForgotPasswordCooldown,
  FORGOT_PASSWORD_COOLDOWN_KEY,
} from '../utils/forgot-password-cooldown.js';

const root = new URL('../', import.meta.url);

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem(key) { return key === FORGOT_PASSWORD_COOLDOWN_KEY ? value : null; },
    setItem(key, next) { if (key === FORGOT_PASSWORD_COOLDOWN_KEY) value = String(next); },
    removeItem(key) { if (key === FORGOT_PASSWORD_COOLDOWN_KEY) value = null; },
    value() { return value; },
  };
}

async function withStorage(value, callback) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value });
  try { return await callback(); }
  finally {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete globalThis.sessionStorage;
    clearForgotPasswordCooldown();
  }
}

test('forgot password cooldown stores only an absolute deadline and remains accurate after background time', async () => {
  const store = memoryStorage();
  await withStorage(store, () => {
    const deadline = startForgotPasswordCooldown(360_000, 1_000);
    assert.equal(deadline, 361_000);
    assert.equal(store.value(), '361000');
    assert.equal(readForgotPasswordCooldownUntil(1_000), 361_000);
    assert.equal(cooldownSecondsRemaining(deadline, 181_000), 180);
    assert.equal(cooldownSecondsRemaining(deadline, 361_000), 0);
    assert.equal(formatCooldown(359), '05:59');
  });
});
test('forgot password cooldown rejects corrupt storage and falls back to memory when storage is blocked', async () => {
  const corrupt = memoryStorage('not-a-deadline');
  await withStorage(corrupt, () => {
    assert.equal(readForgotPasswordCooldownUntil(1_000), 0);
    assert.equal(corrupt.value(), null);
  });

  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    get() { throw new Error('blocked'); },
  });
  try {
    const deadline = startForgotPasswordCooldown(60_000, 10_000);
    assert.equal(readForgotPasswordCooldownUntil(10_000), deadline);
  } finally {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original);
    else delete globalThis.sessionStorage;
    clearForgotPasswordCooldown();
  }
});

test('forgot password forms share one guarded controller and reset-password token form stays separate', async () => {
  const [binder, forgot, account, reset] = await Promise.all([
    readFile(new URL('components/forms/forgot-password-form.js', root), 'utf8'),
    readFile(new URL('pages/auth/forgot-password.js', root), 'utf8'),
    readFile(new URL('pages/app/account.js', root), 'utf8'),
    readFile(new URL('pages/auth/reset-password.js', root), 'utf8'),
  ]);
  assert.match(binder, /if \(inFlight \|\| isCoolingDown\(\) \|\| !canSubmit\) return/);
  assert.match(binder, /submitButton\.textContent = FORGOT_PASSWORD_PROCESSING_LABEL/);
  assert.match(binder, /Kirim ulang instruksi/);
  assert.match(binder, /showStatus\(status, 'Memproses permintaan\.\.\.'/);
  assert.match(binder, /FORGOT_PASSWORD_SUCCESS_COOLDOWN_MS = 360_000/);
  assert.match(binder, /FORGOT_PASSWORD_UNCERTAIN_COOLDOWN_MS = 60_000/);
  assert.match(binder, /error\?\.status === 429/);
  assert.match(binder, /error\?\.status >= 500/);
  assert.match(binder, /globalThis\.setInterval/);
  assert.match(binder, /pagehide/);
  assert.match(forgot, /bindForgotPasswordForm/);
  assert.match(account, /bindForgotPasswordForm/);
  assert.doesNotMatch(reset, /bindForgotPasswordForm|FORGOT_PASSWORD_COOLDOWN/);
});
