import { authService } from '../../services/auth-service.js';
import { starterService } from '../../services/starter-service.js';
import { normalizeEmail, validateEmail, validateVerifyOtp } from '../../validators/auth-validator.js';
import { clearFieldErrors, formValues, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';
import { authErrorMessage, pendingStarterClaim, safeMembershipIntent, safeReturnTo, starterPublicIdFromReturnTo, withAuthContext } from '../../utils/auth-flow.js';

const form = document.querySelector('[data-verify-form]');
const resend = document.querySelector('[data-resend-otp]');
const status = document.querySelector('[data-form-status]');
const params = new URLSearchParams(location.search);
const returnTo = safeReturnTo(params.get('returnTo'));
const intent = safeMembershipIntent(params.get('intent'));
const starterId = starterPublicIdFromReturnTo(returnTo) || pendingStarterClaim();
const emailInput = form?.elements.email;
if (emailInput && params.get('email')) emailInput.value = normalizeEmail(params.get('email'));
const loginLink = document.querySelector('a[href="/login/"]');
if (loginLink) loginLink.href = withAuthContext('/login/', { returnTo, intent });
if (starterId) {
  document.querySelector('.auth-intro')?.replaceChildren(document.createTextNode('Masukkan kode 6 digit. Sesudah login, kartu Starter akan otomatis muncul di workspace.'));
  prepareStarterVerification();
}

form?.elements.code?.addEventListener('input', (event) => {
  event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = formValues(form);
  input.email = normalizeEmail(input.email);
  input.code = String(input.code ?? '').replace(/\D/g, '').slice(0, 6);
  const errors = validateVerifyOtp(input);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    showStatus(status, 'OTP belum valid.', 'error');
    return;
  }
  clearFieldErrors(form);
  setBusy(form, true);
  showStatus(status, 'Memverifikasi email...', 'info');
  try {
    await authService.verifyEmailOtp(input);
    showStatus(status, 'Email berhasil diverifikasi. Lanjutkan ke login untuk menghubungkan kartu.', 'success');
    location.assign(withAuthContext('/login/', { returnTo, intent }));
  } catch (error) {
    showFieldErrors(form, mapApiFieldErrors(error.details));
    showStatus(status, authErrorMessage(error, 'Kode OTP belum dapat diverifikasi.'), 'error');
  } finally {
    setBusy(form, false);
  }
});

resend?.addEventListener('click', async () => {
  const email = normalizeEmail(form?.elements.email?.value);
  const emailError = validateEmail(email);
  const errors = emailError ? { email: emailError } : {};
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    return;
  }
  resend.disabled = true;
  try {
    await authService.resendEmailOtp({ email });
    showStatus(status, 'Jika email memenuhi syarat, OTP baru sudah dikirim.', 'success');
    startCooldown(60);
  } catch (error) {
    showStatus(status, authErrorMessage(error, 'OTP belum dapat dikirim ulang.'), 'error');
    resend.disabled = false;
  }
});

function startCooldown(seconds) {
  let remaining = seconds;
  const label = resend.textContent;
  const timer = setInterval(() => {
    remaining -= 1;
    resend.textContent = `Kirim ulang (${remaining})`;
    if (remaining <= 0) {
      clearInterval(timer);
      resend.textContent = label;
      resend.disabled = false;
    }
  }, 1000);
}

async function prepareStarterVerification() {
  if (!emailInput) return;
  emailInput.readOnly = true;
  emailInput.setAttribute('aria-readonly', 'true');
  showStatus(status, 'Memuat email kartu Starter...', 'info');
  try {
    const context = await starterService.signupContext(starterId);
    emailInput.value = normalizeEmail(context?.email);
    if (!emailInput.value) throw new Error('Starter signup context did not include an email.');
    showStatus(status, 'Email kartu siap. Masukkan kode OTP yang telah dikirim.', 'success');
    form?.elements.code?.focus();
  } catch {
    showStatus(status, 'Konteks kartu tidak tersedia. Buka kembali link pengelolaan terbaru dari email Anda.', 'error');
  }
}
