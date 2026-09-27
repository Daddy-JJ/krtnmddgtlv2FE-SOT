import { bindForgotPasswordForm } from '../../components/forms/forgot-password-form.js';

bindForgotPasswordForm({
  form: document.querySelector('[data-forgot-form]'),
  status: document.querySelector('[data-form-status]'),
  submit: document.querySelector('[data-forgot-submit]'),
  cooldownNote: document.querySelector('[data-form-cooldown-note]'),
});
