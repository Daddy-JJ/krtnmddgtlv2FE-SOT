import { authService } from '../../services/auth-service.js';
import { apiErrorMessage } from '../../utils/api-error-message.js';
import { normalizeEmail, validateForgotPassword } from '../../validators/auth-validator.js';
import {
  clearFieldErrors,
  formValues,
  mapApiFieldErrors,
  setBusy,
  showFieldErrors,
  showStatus,
} from './form-utils.js';
import {
  clearForgotPasswordCooldown,
  cooldownSecondsRemaining,
  formatCooldown,
  readForgotPasswordCooldownUntil,
  startForgotPasswordCooldown,
} from '../../utils/forgot-password-cooldown.js';

export const FORGOT_PASSWORD_SUCCESS_COOLDOWN_MS = 360_000;
export const FORGOT_PASSWORD_UNCERTAIN_COOLDOWN_MS = 60_000;
export const FORGOT_PASSWORD_SUCCESS_MESSAGE = 'Jika email terdaftar, tautan reset akan dikirim. Pengiriman diproses berkala setiap 6 menit dan bisa memerlukan waktu tambahan. Periksa Inbox dan Spam sebelum meminta ulang.';
export const FORGOT_PASSWORD_COOLDOWN_NOTE = 'Hitung mundur menunjukkan waktu untuk meminta ulang, bukan kepastian waktu email tiba.';
export const FORGOT_PASSWORD_UNCERTAIN_MESSAGE = 'Status permintaan belum dapat dipastikan. Periksa email sebelum mencoba lagi.';
const FORGOT_PASSWORD_PROCESSING_LABEL = 'Memproses permintaan...';
const FORGOT_PASSWORD_RESEND_LABEL = 'Kirim ulang instruksi';

const COOLDOWN_RESTORED_MESSAGE = 'Permintaan reset masih dalam jeda. Tunggu sampai hitung mundur selesai sebelum meminta ulang.';

function isUncertain(error) {
  return error?.code === 'NETWORK_ERROR'
    || error?.code === 'REQUEST_TIMEOUT'
    || error?.code === 'REQUEST_ABORTED'
    || (error?.status >= 500 && error?.status < 600);
}
function retryAfterIsValid(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function rateLimitMessage(hasRetryAfter) {
  return hasRetryAfter
    ? 'Permintaan dibatasi. Tunggu sampai hitung mundur selesai sebelum mencoba kembali.'
    : 'Permintaan dibatasi. Tunggu jeda enam menit sebelum mencoba kembali; waktu ini adalah jeda UX dan bukan jaminan pembatasan server selesai.';
}

export function bindForgotPasswordForm({ form, status, submit, cooldownNote, ready = true } = {}) {
  if (!form) return { dispose() {}, setReady() {}, isCoolingDown: () => false };
  const submitButton = submit ?? form.querySelector('button[type=submit]');
  const note = cooldownNote ?? (() => {
    if (!submitButton) return null;
    const node = form.ownerDocument?.createElement('p');
    if (!node) return null;
    node.className = 'text-sm';
    node.hidden = true;
    node.dataset.formCooldownNote = '';
    submitButton.after(node);
    return node;
  })();
  const originalLabel = String(submitButton?.textContent ?? 'Kirim instruksi reset').trim() || 'Kirim instruksi reset';
  let canSubmit = Boolean(ready);
  let inFlight = false;
  let deadline = readForgotPasswordCooldownUntil();
  let hasSubmitted = Boolean(deadline);
  let timer = null;
  let disposed = false;

  function stopTimer() {
    if (timer !== null) globalThis.clearInterval(timer);
    timer = null;
  }

  function renderCooldown({ announce = false } = {}) {
    if (disposed || !submitButton) return false;
    const seconds = cooldownSecondsRemaining(deadline);
    if (!seconds) {
      stopTimer();
      deadline = 0;
      clearForgotPasswordCooldown();
      if (note) note.hidden = true;
      submitButton.textContent = hasSubmitted ? FORGOT_PASSWORD_RESEND_LABEL : originalLabel;
      submitButton.disabled = !canSubmit || inFlight;
      return false;
    }
    submitButton.disabled = true;
    submitButton.textContent = `Minta ulang dalam ${formatCooldown(seconds)}`;
    if (note) {
      note.hidden = false;
      note.textContent = FORGOT_PASSWORD_COOLDOWN_NOTE;
    }
    if (announce) showStatus(status, COOLDOWN_RESTORED_MESSAGE, 'info');
    return true;
  }

  function startTimer() {
    stopTimer();
    timer = globalThis.setInterval(() => renderCooldown(), 1000);
  }

  function startCooldown(durationMs) {
    hasSubmitted = true;
    deadline = startForgotPasswordCooldown(durationMs);
    if (!deadline) return false;
    renderCooldown();
    startTimer();
    return true;
  }

  function isCoolingDown() {
    if (!deadline) deadline = readForgotPasswordCooldownUntil();
    return renderCooldown();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (inFlight || isCoolingDown() || !canSubmit) return;
    const input = formValues(form);
    input.email = normalizeEmail(input.email);
    const errors = validateForgotPassword(input);
    if (Object.keys(errors).length) {
      showFieldErrors(form, errors);
      return;
    }
    clearFieldErrors(form);
    inFlight = true;
    setBusy(form, true);
    if (submitButton) submitButton.textContent = FORGOT_PASSWORD_PROCESSING_LABEL;
    showStatus(status, 'Memproses permintaan...', 'info');
    try {
      await authService.forgotPassword(input);
      startCooldown(FORGOT_PASSWORD_SUCCESS_COOLDOWN_MS);
      showStatus(status, FORGOT_PASSWORD_SUCCESS_MESSAGE, 'success');
    } catch (error) {
      showFieldErrors(form, mapApiFieldErrors(error.details));
      if (error?.status === 422) {
        showStatus(status, apiErrorMessage(error, 'Periksa alamat email.'), 'error');
      } else if (error?.status === 429) {
        const hasRetryAfter = retryAfterIsValid(error.retryAfterSeconds);
        startCooldown((hasRetryAfter ? error.retryAfterSeconds : 360) * 1000);
        showStatus(status, rateLimitMessage(hasRetryAfter), 'error');
      } else if (isUncertain(error)) {
        startCooldown(FORGOT_PASSWORD_UNCERTAIN_COOLDOWN_MS);
        showStatus(status, FORGOT_PASSWORD_UNCERTAIN_MESSAGE, 'error');
      } else {
        showStatus(status, apiErrorMessage(error, 'Instruksi reset belum dapat diproses.'), 'error');
      }
    } finally {
      inFlight = false;
      setBusy(form, false);
      renderCooldown();
    }
  }

  form.addEventListener('submit', handleSubmit);
  if (deadline > Date.now()) {
    renderCooldown({ announce: true });
    startTimer();
  } else {
    deadline = 0;
    renderCooldown();
  }

  function setReady(value) {
    canSubmit = Boolean(value);
    renderCooldown();
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    stopTimer();
    form.removeEventListener('submit', handleSubmit);
  }

  globalThis.addEventListener?.('pagehide', dispose, { once: true });
  return { dispose, setReady, isCoolingDown };
}
