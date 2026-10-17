import { authService } from '../../services/auth-service.js';
import { validateLogin, normalizeEmail } from '../../validators/auth-validator.js';
import { clearFieldErrors, formValues, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';
import { authErrorMessage, forgetStarterClaim, pendingStarterClaim, postLoginDestination, safeMembershipIntent, safeReturnTo, starterPublicIdFromReturnTo, withAuthContext } from '../../utils/auth-flow.js';

const form = document.querySelector('[data-login-form]');
const status = document.querySelector('[data-form-status]');
const query = new URLSearchParams(location.search);
const returnTo = safeReturnTo(query.get('returnTo'));
const intent = safeMembershipIntent(query.get('intent'));
const starterId = starterPublicIdFromReturnTo(returnTo) || pendingStarterClaim();
const registerLink = document.querySelector('a[href="/register/"]');
let loginPending = false;

if (registerLink) registerLink.href = withAuthContext('/register/', { returnTo, intent });
if (starterId) {
  const note = document.createElement('p');
  note.className = 'auth-intro mt-3';
  note.textContent = 'Login tidak menghubungkan kartu otomatis. Setelah masuk, pilih kartu Anda di Ringkasan dan konfirmasikan pengaitan.';
  form?.before(note);
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (loginPending) return;
  const input = formValues(form);
  input.email = normalizeEmail(input.email);
  const errors = validateLogin(input);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    showStatus(status, 'Periksa email dan password.', 'error');
    return;
  }
  loginPending = true;
  clearFieldErrors(form);
  setBusy(form, true);
  showStatus(status, 'Masuk ke akun...', 'info');
  try {
    const result = await authService.login(input);
    showStatus(status, 'Login berhasil.', 'success');
    if (starterId) {
      // The dashboard lists backend-proven candidates; claim requires a separate
      // selection/confirmation. A management credential is not edit authority.
      forgetStarterClaim();
      location.assign('/app/');
      return;
    }
    if (returnTo) { location.assign(returnTo); return; }
    const roles = Array.isArray(result?.user?.roles) ? result.user.roles : result?.user?.role;
    location.assign(postLoginDestination(roles, { intent }));
  } catch (error) {
    showFieldErrors(form, mapApiFieldErrors(error.details));
    showStatus(status, authErrorMessage(error), 'error');
  } finally {
    loginPending = false;
    setBusy(form, false);
  }
});
