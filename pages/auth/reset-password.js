import { authService } from '../../services/auth-service.js';
import { validateResetPassword } from '../../validators/auth-validator.js';
import { clearFieldErrors, formValues, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';
import { apiErrorMessage } from '../../utils/api-error-message.js';

const form = document.querySelector('[data-reset-form]');
const status = document.querySelector('[data-form-status]');
const token = readResetToken();
form?.elements.token?.closest('div')?.remove();

if (!token) {
  setBusy(form, true);
  form?.removeAttribute('aria-busy');
  showStatus(status, 'Tautan reset password tidak valid atau tidak lengkap.', 'error');
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = { ...formValues(form), token };
  const errors = validateResetPassword(input);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    return;
  }
  clearFieldErrors(form);
  setBusy(form, true);
  showStatus(status, 'Mereset password...', 'info');
  try {
    await authService.resetPassword(input);
    showStatus(status, 'Password berhasil direset. Silakan login.', 'success');
    location.assign('/login/');
  } catch (error) {
    showFieldErrors(form, mapApiFieldErrors(error.details));
    showStatus(status, apiErrorMessage(error, 'Password belum dapat direset.'), 'error');
  } finally {
    setBusy(form, false);
  }
});

function readResetToken() {
  const url = new URL(location.href);
  const fragment = new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
  const fragmentToken = fragment.get('token') ?? '';
  const legacyQueryToken = url.searchParams.get('token') ?? '';
  if (!fragmentToken && !legacyQueryToken) return '';

  url.searchParams.delete('token');
  fragment.delete('token');
  url.hash = fragment.toString() ? `#${fragment.toString()}` : '';
  history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  return fragmentToken || legacyQueryToken;
}
