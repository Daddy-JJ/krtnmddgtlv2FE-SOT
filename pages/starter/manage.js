import { starterService } from '../../services/starter-service.js';
import { rememberStarterClaim, withAuthContext } from '../../utils/auth-flow.js';
import { showStatus } from '../../components/forms/form-utils.js';
import { apiErrorMessage } from '../../utils/api-error-message.js';

const status = document.querySelector('[data-form-status]');
const params = new URLSearchParams(location.search);
const publicId = params.get('publicId') ?? '';
const returnTo = publicId ? `/starter/manage/?publicId=${encodeURIComponent(publicId)}` : '';

if (!publicId) {
  showStatus(status, 'Link pengelolaan tidak lengkap. Buka kembali link dari email Anda.', 'error');
} else {
  openEmailAccess();
}

async function openEmailAccess() {
  const token = new URLSearchParams(location.hash.slice(1)).get('token');
  if (!token) {
    rememberStarterClaim(publicId);
    showStatus(status, 'Membuka pendaftaran akun...', 'info');
    location.replace(withAuthContext('/register/', { returnTo }));
    return;
  }
  showStatus(status, 'Memverifikasi link pengelolaan...', 'info');
  try {
    await starterService.openAccess(publicId, token);
    rememberStarterClaim(publicId);
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    showStatus(status, 'Link terverifikasi. Membuka pendaftaran akun...', 'success');
    location.replace(withAuthContext('/register/', { returnTo }));
  } catch (error) {
    if (error.code === 'CARD_EMAIL_IDENTITY_REVIEW_REQUIRED') {
      showStatus(status, apiErrorMessage(error), 'error');
      document.querySelector('[data-starter-identity-support]')?.removeAttribute('hidden');
    } else {
      showStatus(status, 'Link pengelolaan tidak valid atau sudah kedaluwarsa. Minta link baru melalui support.', 'error');
    }
  }
}
