import { resumeService } from '../../services/resume-service.js';

const id = new URLSearchParams(location.search).get('id');
const form = document.querySelector('[data-form]');
const status = document.querySelector('[data-status]');
const submit = form?.querySelector('button[type=submit]');
let submitting = false;

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitting) return;
  submitting = true;
  if (submit) submit.disabled = true;
  form.setAttribute('aria-busy', 'true');
  status.textContent = 'Mengirim...';
  try {
    await resumeService.revision(id, new FormData(form).get('notes'));
    location.assign(`/app/resume-enhancement/request/?id=${encodeURIComponent(id)}`);
  } catch {
    status.textContent = 'Permintaan revisi belum dapat dikirim. Coba kembali.';
    submitting = false;
    if (submit) submit.disabled = false;
    form.removeAttribute('aria-busy');
  }
});
