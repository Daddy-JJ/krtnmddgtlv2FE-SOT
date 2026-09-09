import { authService } from '../../services/auth-service.js';
import { starterService } from '../../services/starter-service.js';
import { validateRegister, normalizeEmail } from '../../validators/auth-validator.js';
import { clearFieldErrors, formValues, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';
import { authErrorMessage, pendingStarterClaim, safeMembershipIntent, safeReturnTo, starterPublicIdFromReturnTo, withAuthContext } from '../../utils/auth-flow.js';

const form = document.querySelector('[data-register-form]');
const status = document.querySelector('[data-form-status]');
const query = new URLSearchParams(location.search);
const returnTo = safeReturnTo(query.get('returnTo'));
const intent = safeMembershipIntent(query.get('intent'));
const starterId = starterPublicIdFromReturnTo(returnTo) || pendingStarterClaim();
const loginLink = document.querySelector('a[href="/login/"]');
const emailInput = form?.elements.email;
const submitButton = form?.querySelector('button[type="submit"]');
const existingAccountLink = createExistingAccountLink();

if (loginLink) loginLink.href = withAuthContext('/login/', { returnTo, intent });
if (starterId) {
  loginLink?.setAttribute('hidden', '');
  document.querySelector('.auth-intro')?.replaceChildren(document.createTextNode('Email kartu Starter sudah disiapkan. Buat password untuk mengamankan kartu dan melanjutkan verifikasi.'));
  prepareStarterSignup();
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = formValues(form);
  input.email = normalizeEmail(input.email);
  const errors = validateRegister(input);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    showStatus(status, 'Periksa field yang ditandai.', 'error');
    return;
  }
  clearFieldErrors(form);
  existingAccountLink?.setAttribute('hidden', '');
  setBusy(form, true);
  showStatus(status, starterId ? 'Membuat akun untuk menghubungkan kartu Starter...' : 'Mendaftarkan akun...', 'info');
  try {
    await authService.register(input);
    showStatus(status, 'Registrasi diterima. Kode OTP dikirim ke email Anda.', 'success');
    const next = new URL('/verify-email/', location.origin);
    if (!starterId) next.searchParams.set('email', input.email);
    if (returnTo) next.searchParams.set('returnTo', returnTo);
    if (intent) next.searchParams.set('intent', intent);
    location.assign(`${next.pathname}${next.search}`);
  } catch (error) {
    showFieldErrors(form, mapApiFieldErrors(error.details));
    if (starterId && error.code === 'EMAIL_ALREADY_EXISTS') {
      existingAccountLink?.removeAttribute('hidden');
      existingAccountLink?.focus();
    }
    showStatus(status, authErrorMessage(error, 'Pendaftaran belum dapat diproses.'), 'error');
  } finally {
    setBusy(form, false);
  }
});

async function prepareStarterSignup() {
  if (!emailInput || !submitButton) return;
  emailInput.readOnly = true;
  emailInput.setAttribute('aria-readonly', 'true');
  submitButton.disabled = true;
  showStatus(status, 'Memuat email kartu Starter...', 'info');
  try {
    const context = await starterService.signupContext(starterId);
    emailInput.value = normalizeEmail(context?.email);
    if (!emailInput.value) throw new Error('Starter signup context did not include an email.');
    submitButton.disabled = false;
    showStatus(status, 'Email sudah terisi. Buat password untuk melanjutkan.', 'success');
    form?.elements.password?.focus();
  } catch {
    showStatus(status, 'Link pengelolaan tidak valid atau sudah kedaluwarsa. Buka kembali link terbaru dari email Anda.', 'error');
  }
}

function createExistingAccountLink() {
  const link = document.createElement('a');
  link.className = 'auth-secondary block min-h-11 rounded-lg border px-4 py-3 text-center font-bold';
  link.href = withAuthContext('/login/', { returnTo, intent });
  link.dataset.existingAccountLogin = '';
  link.hidden = true;
  link.textContent = 'Email ini sudah memiliki akun — masuk untuk melanjutkan';
  submitButton?.after(link);
  return link;
}
