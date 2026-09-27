import { authService } from '../../services/auth-service.js';
import { normalizeEmail } from '../../validators/auth-validator.js';
import { bindForgotPasswordForm } from '../../components/forms/forgot-password-form.js';
import { showStatus } from '../../components/forms/form-utils.js';
import { apiErrorMessage } from '../../utils/api-error-message.js';

const resetForm = document.querySelector('[data-account-reset-form]');
const status = document.querySelector('[data-form-status]');
const resetController = bindForgotPasswordForm({
  form: resetForm,
  status,
  submit: document.querySelector('[data-account-reset-submit]'),
  cooldownNote: document.querySelector('[data-form-cooldown-note]'),
  ready: false,
});

void loadAccount();

async function loadAccount() {
  showStatus(status, 'Memuat keamanan akun...', 'info');
  try {
    const account = await authService.current();
    const email = normalizeEmail(account?.user?.email);
    if (!email) throw new Error('Email akun belum dapat dimuat.');

    if (resetForm?.elements.email) resetForm.elements.email.value = email;
    resetController.setReady(true);

    if (!resetController.isCoolingDown()) {
      showStatus(status, 'Reset password siap digunakan.', 'success');
    }
  } catch (error) {
    if (error?.status === 401) {
      location.assign('/login/');
      return;
    }
    showStatus(status, apiErrorMessage(error, 'Keamanan akun belum dapat dimuat.'), 'error');
  }
}
