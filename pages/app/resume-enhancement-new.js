import { resumeService } from '../../services/resume-service.js';
import { validateResumeSourceDocx } from '../../validators/resume-file-validator.js';
import { buildResumeRequestInput, validateResumeRequestInput } from '../../validators/resume-request-validator.js';
import { apiErrorMessage, resumeUploadState } from '../../utils/api-error-message.js';

const form = document.querySelector('[data-form]');
const status = document.querySelector('[data-status]');
const fileInput = form.elements.sourceResume;
const fileStatus = document.querySelector('[data-file-status]');

fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  fileStatus.textContent = file
    ? `${file.name} · ${formatBytes(file.size)}`
    : 'Belum ada file dipilih.';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const file = fileInput.files?.[0];
  const fileError = validateResumeSourceDocx(file);
  if (fileError) {
    status.textContent = fileError;
    fileInput.focus();
    return;
  }

  const rawData = Object.fromEntries(new FormData(form));
  delete rawData.sourceResume;
  const data = buildResumeRequestInput(rawData);
  const errors = validateResumeRequestInput(data);
  if (Object.keys(errors).length) {
    const [field, message] = Object.entries(errors)[0];
    status.textContent = message;
    form.elements[field]?.focus();
    return;
  }

  let publicId = null;
  setBusy(true, 'Membuat permintaan...');
  try {
    const created = await resumeService.create(data);
    publicId = created.publicId;
    status.textContent = 'Mengupload dan memvalidasi CV...';
    await resumeService.upload(publicId, 'SOURCE_RESUME', file);
    location.assign(`/app/resume-enhancement/request/?id=${encodeURIComponent(publicId)}`);
  } catch (error) {
    if (publicId) {
      location.assign(`/app/resume-enhancement/request/?id=${encodeURIComponent(publicId)}&upload=${resumeUploadState(error)}`);
      return;
    }
    status.textContent = apiErrorMessage(error, 'Permintaan Resume belum dapat dibuat.');
    setBusy(false);
  }
});

function setBusy(busy, message) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = busy;
  if (message) status.textContent = message;
}

function formatBytes(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
