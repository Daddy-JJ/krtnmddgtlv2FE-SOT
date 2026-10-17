import { starterService } from '../../services/starter-service.js';
import { buildStarterInput, validateStarterCreateValues } from '../../validators/starter-validator.js';
import { clearFieldErrors, formValues, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';
import { bindWebsiteUrlInput } from '../../utils/website-url.js';
import { apiErrorMessage } from '../../utils/api-error-message.js';
import { safeHttpUrl } from '../../utils/safe-url.js';

const form = document.querySelector('[data-starter-create-form]');
const status = document.querySelector('[data-form-status]');
const result = document.querySelector('[data-starter-result]');
const resultUrl = document.querySelector('[data-starter-url]');
const manageLink = document.querySelector('[data-starter-manage-link]');
const emailStatus = document.querySelector('[data-starter-email-status]');
const recovery = document.querySelector('[data-starter-create-recovery]');
const recoveryMessage = document.querySelector('[data-starter-recovery-message]');
const recoveryLogin = document.querySelector('[data-starter-recovery-login]');
const recoveryInstructions = document.querySelector('[data-starter-recovery-instructions]');
const submit = form?.querySelector('[type="submit"]');
const controller = new AbortController();
const duplicateMessage = 'Kartu baru tidak dibuat. Masuk untuk memeriksa kartu yang sudah ada dengan email ini, atau gunakan tautan Kelola kartu dari email Anda.';
const uncertainMessage = 'Status pembuatan kartu belum dapat dipastikan. Periksa email dan kartu di akun Anda sebelum mencoba lagi agar tidak membuat kartu ganda.';
let phase = 'idle';
let rejectedEmail = '';
let cooldownUntil = 0;
let timer;

bindWebsiteUrlInput(form?.elements.websiteUrl);

function emailValue() {
  return String(form?.elements.email.value ?? '').trim().toLowerCase();
}
function syncControls() {
  if (!form) return;
  setBusy(form, phase === 'submitting');
  if (['created', 'uncertain', 'review', 'disposed'].includes(phase)) {
    form.querySelectorAll('button,input,textarea,select').forEach(element => { element.disabled = true; });
  }
  if (!submit) return;
  const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
  submit.disabled = phase !== 'idle' || remaining > 0 || Boolean(rejectedEmail && emailValue() === rejectedEmail);
  submit.textContent = phase === 'submitting' ? 'Membuat kartu Starter...'
    : phase === 'created' ? 'Kartu sudah dibuat'
    : phase === 'review' ? 'Hubungi bantuan untuk melanjutkan'
    : phase === 'uncertain' || phase === 'disposed' ? 'Periksa kartu yang sudah ada'
    : remaining ? `Coba lagi dalam ${remaining} detik`
    : rejectedEmail && emailValue() === rejectedEmail ? 'Gunakan kartu yang sudah ada' : 'Buat kartu Starter';
}
function offerRecovery(message, review = false) {
  if (recoveryMessage) recoveryMessage.textContent = message;
  if (recoveryLogin) recoveryLogin.hidden = review;
  if (recoveryInstructions) recoveryInstructions.hidden = review;
  if (recovery) recovery.hidden = false;
}
function onEmailInput() {
  if (phase !== 'idle' || !rejectedEmail) return;
  const sameEmail = emailValue() === rejectedEmail;
  if (recovery) recovery.hidden = !sameEmail;
  clearFieldErrors(form);
  showStatus(status, sameEmail ? duplicateMessage : '', sameEmail ? 'error' : 'info');
  syncControls();
}
function validationErrors(details) {
  if (!Array.isArray(details)) return {};
  const allowed = new Set(['namePrefix', 'firstName', 'lastName', 'jobTitle', 'organization', 'officePhone', 'mobilePhone', 'email', 'websiteUrl', 'addressText']);
  return mapApiFieldErrors(details.flatMap(item => {
    if (!item || typeof item.field !== 'string') return [];
    const field = item.field.replace(/^contact\./, '').replace(/^fullName$/, 'firstName');
    return allowed.has(field) ? [{ field, message: 'Periksa isian ini.' }] : [];
  }));
}
async function onSubmit(event) {
  event.preventDefault();
  // Disabled alone does not guard repeated Enter or programmatic submit events.
  if (phase !== 'idle' || Date.now() < cooldownUntil || (rejectedEmail && emailValue() === rejectedEmail)) return;
  const values = formValues(form);
  const input = buildStarterInput(values, document.documentElement.lang);
  const errors = validateStarterCreateValues(values, document.documentElement.lang);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    showStatus(status, 'Periksa data kartu Starter.', 'error');
    return;
  }
  phase = 'submitting';
  clearFieldErrors(form);
  if (recovery) recovery.hidden = true;
  syncControls();
  showStatus(status, 'Membuat kartu Starter...', 'info');
  try {
    const card = await starterService.create(input, { signal: controller.signal });
    if (phase === 'disposed') return;
    // The service verifies the published-card envelope before this terminal state.
    const canonicalUrl = safeHttpUrl(card.canonicalUrl);
    if (!canonicalUrl) throw Object.assign(new Error('Invalid Starter URL.'), { code: 'STARTER_CREATE_INVALID' });
    phase = 'created';
    const emailSent = card?.emailSent === true;
    showStatus(status, emailSent
      ? 'Kartu Starter berhasil dibuat. Link pengelolaan dikirim ke email Anda.'
      : 'Kartu berhasil dibuat, tetapi email pengelolaan gagal dikirim.', emailSent ? 'success' : 'error');
    result.hidden = false;
    resultUrl.href = canonicalUrl;
    resultUrl.textContent = canonicalUrl;
    manageLink.href = `/starter/manage/?publicId=${encodeURIComponent(card.publicId)}`;
    if (emailStatus) emailStatus.textContent = emailSent
      ? 'Link pengelolaan kartu sudah dikirim ke email Anda.'
      : 'Kartu Anda tetap terbit. Gunakan tombol Kelola kartu Starter, atau masuk dan periksa kartu melalui pemulihan email terverifikasi. Jangan membuat ulang kartu.';
    result.querySelector('h2')?.focus();
  } catch (error) {
    if (phase === 'disposed') return;
    phase = 'idle';
    if (error.status === 409 && error.code === 'STARTER_EMAIL_ALREADY_EXISTS') {
      // Never trust card IDs/URLs/credentials in a public conflict payload.
      rejectedEmail = input.contact.email;
      showStatus(status, apiErrorMessage(error, duplicateMessage), 'error');
      offerRecovery(duplicateMessage);
    } else if (error.status === 409 && error.code === 'CARD_EMAIL_IDENTITY_REVIEW_REQUIRED') {
      phase = 'review';
      const message = apiErrorMessage(error);
      showStatus(status, message, 'error');
      offerRecovery(message, true);
    } else if (error.status === 422) {
      const fields = validationErrors(error.details);
      if (Object.keys(fields).length) showFieldErrors(form, fields);
      showStatus(status, apiErrorMessage(error, 'Periksa data kartu Starter. Isian Anda tetap tersimpan di halaman ini.'), 'error');
    } else if (error.status === 429) {
      const seconds = Number.isSafeInteger(error.retryAfterSeconds) && error.retryAfterSeconds >= 0
        && error.retryAfterSeconds <= (Number.MAX_SAFE_INTEGER - Date.now()) / 1000 ? Math.max(1, error.retryAfterSeconds) : 30;
      cooldownUntil = Date.now() + seconds * 1000;
      showStatus(status, apiErrorMessage(error, 'Terlalu banyak permintaan. Tunggu sebelum mencoba lagi.'), 'error');
      timer = setInterval(() => {
        syncControls();
        if (Date.now() >= cooldownUntil) { clearInterval(timer); timer = undefined; }
      }, 1000);
    } else if (!error.status || error.status >= 500 || error.code === 'STARTER_CREATE_INVALID') {
      phase = 'uncertain';
      showStatus(status, apiErrorMessage({ requestId: error.requestId }, uncertainMessage), 'error');
      offerRecovery(uncertainMessage);
    } else {
      showStatus(status, apiErrorMessage(error, 'Kartu belum dapat dibuat. Periksa data atau hubungi bantuan.'), 'error');
    }
  } finally {
    if (phase !== 'disposed') syncControls();
  }
}
function dispose() {
  phase = 'disposed';
  controller.abort();
  clearInterval(timer);
  rejectedEmail = '';
  form?.removeEventListener('submit', onSubmit);
  form?.elements.email.removeEventListener('input', onEmailInput);
  form?.elements.email.removeEventListener('change', onEmailInput);
  syncControls();
}
form?.addEventListener('submit', onSubmit);
form?.elements.email.addEventListener('input', onEmailInput);
form?.elements.email.addEventListener('change', onEmailInput);
addEventListener('pagehide', dispose, { once: true });
addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
