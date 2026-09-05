import { starterService } from '../../services/starter-service.js';
import { buildStarterInput, validateStarterCreateValues } from '../../validators/starter-validator.js';
import { clearFieldErrors, formValues, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';
import { bindWebsiteUrlInput } from '../../utils/website-url.js';

const form = document.querySelector('[data-starter-create-form]');
const status = document.querySelector('[data-form-status]');
const result = document.querySelector('[data-starter-result]');
const resultUrl = document.querySelector('[data-starter-url]');
const manageLink = document.querySelector('[data-starter-manage-link]');
const emailStatus = document.querySelector('[data-starter-email-status]');

bindWebsiteUrlInput(form?.elements.websiteUrl);

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const values = formValues(form);
  const input = buildStarterInput(values, document.documentElement.lang);
  const errors = validateStarterCreateValues(values, document.documentElement.lang);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    showStatus(status, 'Periksa data kartu Starter.', 'error');
    return;
  }
  clearFieldErrors(form);
  setBusy(form, true);
  showStatus(status, 'Membuat kartu Starter...', 'info');
  try {
    const card = await starterService.create(input);
    const emailSent = card?.emailSent === true;
    showStatus(status, emailSent
      ? 'Kartu Starter berhasil dibuat. Link pengelolaan dikirim ke email Anda.'
      : 'Kartu berhasil dibuat, tetapi email pengelolaan gagal dikirim.', emailSent ? 'success' : 'error');
    result.hidden = false;
    resultUrl.href = card.canonicalUrl;
    resultUrl.textContent = card.canonicalUrl;
    manageLink.href = `/starter/manage/?publicId=${encodeURIComponent(card.publicId)}`;
    if (emailStatus) emailStatus.textContent = emailSent
      ? 'Link pengelolaan kartu sudah dikirim ke email Anda.'
      : 'Email pengelolaan gagal dikirim. Silakan simpan URL ini dan hubungi support untuk bantuan.';
  } catch (error) {
    showFieldErrors(form, mapApiFieldErrors(error.details));
    showStatus(status, error.message, 'error');
  } finally {
    setBusy(form, false);
  }
});
