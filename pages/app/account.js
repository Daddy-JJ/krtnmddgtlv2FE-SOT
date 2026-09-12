import { authService } from '../../services/auth-service.js';
import { normalizeEmail, validateForgotPassword } from '../../validators/auth-validator.js';
import { clearFieldErrors, formValues, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';

const resetForm = document.querySelector('[data-account-reset-form]');
const logoutButton = document.querySelector('[data-account-logout]');
const status = document.querySelector('[data-form-status]');
const resetSubmit = document.querySelector('[data-account-reset-submit]');

void loadAccount();

async function loadAccount() {
  showStatus(status, 'Memuat keamanan akun...', 'info');
  try {
    const account = await authService.current();
    const email = normalizeEmail(account?.email);
    if (!email) throw new Error('Email akun belum dapat dimuat.');

    if (resetForm?.elements.email) resetForm.elements.email.value = email;
    if (resetSubmit) resetSubmit.disabled = false;

    showStatus(status, 'Reset password siap digunakan.', 'success');
  } catch (error) {
    if (error?.status === 401) {
      location.assign('/login/');
      return;
    }
    showStatus(status, error.message || 'Keamanan akun belum dapat dimuat.', 'error');
  }
}

resetForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = formValues(resetForm);
  input.email = normalizeEmail(input.email);
  const errors = validateForgotPassword(input);
  if (Object.keys(errors).length) {
    showFieldErrors(resetForm, errors);
    return;
  }
  clearFieldErrors(resetForm);
  setBusy(resetForm, true);
  showStatus(status, 'Mengirim instruksi reset password...', 'info');
  try {
    await authService.forgotPassword(input);
    showStatus(status, 'Jika email valid, instruksi reset akan dikirim.', 'success');
  } catch (error) {
    showFieldErrors(resetForm, mapApiFieldErrors(error.details));
    showStatus(status, error.message, 'error');
  } finally {
    setBusy(resetForm, false);
  }
});
logoutButton?.addEventListener('click', async () => {
  logoutButton.disabled = true;
  showStatus(status, 'Keluar dari akun...', 'info');
  try {
    await authService.logout();
    location.assign('/login/');
  } catch (error) {
    showStatus(status, error.message, 'error');
    logoutButton.disabled = false;
  }
});
