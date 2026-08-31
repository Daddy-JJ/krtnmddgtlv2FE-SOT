import { authService } from '../../services/auth-service.js';
import { cardService } from '../../services/card-service.js';
import { starterService } from '../../services/starter-service.js';
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
let retryClaim;

if (registerLink) registerLink.href = withAuthContext('/register/', { returnTo, intent });
if (starterId) addStarterHandoffNotice();

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const input = formValues(form);
  input.email = normalizeEmail(input.email);
  const errors = validateLogin(input);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    showStatus(status, 'Periksa email dan password.', 'error');
    return;
  }
  clearFieldErrors(form);
  setBusy(form, true);
  showStatus(status, 'Masuk ke akun...', 'info');
  try {
    const result = await authService.login(input);
    showStatus(status, 'Login berhasil.', 'success');
    if (starterId) {
      await claimStarter(starterId);
      return;
    }
    if (returnTo) { location.assign(returnTo); return; }
    const roles = Array.isArray(result?.user?.roles) ? result.user.roles : result?.user?.role;
    location.assign(postLoginDestination(roles, { intent }));
  } catch (error) {
    showFieldErrors(form, mapApiFieldErrors(error.details));
    showStatus(status, authErrorMessage(error), 'error');
  } finally {
    setBusy(form, false);
  }
});

async function claimStarter(publicId) {
  showStatus(status, 'Menghubungkan kartu Starter ke akun Anda...', 'info');
  try {
    await starterService.claim(publicId);
    forgetStarterClaim();
    showStatus(status, 'Kartu berhasil dihubungkan. Membuka workspace...', 'success');
    location.assign('/app/?starter=claimed');
  } catch (error) {
    if (await starterAlreadyConnected(publicId)) {
      forgetStarterClaim();
      showStatus(status, 'Kartu Starter sudah terhubung. Membuka workspace...', 'success');
      location.assign('/app/?starter=claimed');
      return;
    }
    showStatus(status, `${authErrorMessage(error, 'Kartu belum dapat dihubungkan.') } Gunakan Coba lagi atau kembali ke link email.`, 'error');
    retryClaim?.removeAttribute('hidden');
  }
}

async function starterAlreadyConnected(publicId) {
  try {
    const cards = await cardService.list();
    return Array.isArray(cards) && cards.some((card) => card.publicId === publicId);
  } catch { return false; }
}

function addStarterHandoffNotice() {
  const note = document.createElement('p');
  note.className = 'auth-intro mt-3';
  note.textContent = 'Setelah login, kartu Starter dari email akan otomatis dihubungkan ke akun ini.';
  form?.before(note);
  retryClaim = document.createElement('button');
  retryClaim.type = 'button';
  retryClaim.className = 'auth-secondary min-h-11 w-full rounded-lg border px-4 py-3 font-semibold';
  retryClaim.textContent = 'Coba hubungkan kartu lagi';
  retryClaim.hidden = true;
  retryClaim.addEventListener('click', () => claimStarter(starterId));
  status?.after(retryClaim);
}
