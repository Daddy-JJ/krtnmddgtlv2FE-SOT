import { resumeService } from '../../services/resume-service.js';
import { validateResumeSourceDocx } from '../../validators/resume-file-validator.js';

const publicId = new URLSearchParams(location.search).get('id');
const uploadPending = new URLSearchParams(location.search).get('upload') === 'pending';
const nodes = {
  name: document.querySelector('[data-name]'),
  meta: document.querySelector('[data-meta]'),
  status: document.querySelector('[data-status]'),
  sla: document.querySelector('[data-sla]'),
  count: document.querySelector('[data-countdown]'),
  deletion: document.querySelector('[data-deletion]'),
  download: document.querySelector('[data-download]'),
  revision: document.querySelector('[data-revision]'),
  live: document.querySelector('[data-live]'),
  uploadPanel: document.querySelector('[data-source-upload-panel]'),
  uploadForm: document.querySelector('[data-source-upload-form]'),
};

if (!publicId) location.assign('/app/resume-enhancement/');
else {
  nodes.uploadForm.addEventListener('submit', uploadSource);
  load();
}

async function load() {
  try {
    const request = await resumeService.detail(publicId);
    nodes.name.textContent = request.beneficiaryName;
    nodes.meta.textContent = `${request.targetRole} · ${request.careerLevel} · ${request.resumeLanguage}`;
    nodes.status.textContent = request.status;
    nodes.sla.textContent = request.slaDueAt
      ? `SLA: ${date(request.slaDueAt)}`
      : 'SLA dimulai setelah data lengkap.';
    nodes.uploadPanel.hidden = request.status !== 'DRAFT';
    if (uploadPending && request.status === 'DRAFT') {
      nodes.live.textContent = 'Permintaan tersimpan. Upload CV belum selesai; pilih kembali file untuk melanjutkan.';
    }
    if (request.completedAt) renderCountdown(request);
    if (request.status === 'COMPLETED' && !request.isExpired) {
      nodes.download.hidden = false;
      nodes.download.href = resumeService.downloadUrl(publicId);
      nodes.revision.hidden = request.revisionCount >= request.maxRevisions;
      nodes.revision.href = `/app/resume-enhancement/revision/?id=${encodeURIComponent(publicId)}`;
    }
  } catch (error) {
    nodes.live.textContent = error.message;
  }
}

async function uploadSource(event) {
  event.preventDefault();
  const file = new FormData(nodes.uploadForm).get('file');
  const validation = validateResumeSourceDocx(file);
  if (validation) {
    nodes.live.textContent = validation;
    return;
  }
  const button = nodes.uploadForm.querySelector('button');
  button.disabled = true;
  nodes.live.textContent = 'Mengupload dan memvalidasi CV...';
  try {
    await resumeService.upload(publicId, 'SOURCE_RESUME', file);
    nodes.uploadForm.reset();
    nodes.live.textContent = 'CV berhasil dikirim ke workspace Specialist.';
    history.replaceState({}, '', `/app/resume-enhancement/request/?id=${encodeURIComponent(publicId)}`);
    await load();
  } catch (error) {
    nodes.live.textContent = error.message;
  } finally {
    button.disabled = false;
  }
}

function renderCountdown(request) {
  if (request.isExpired) {
    nodes.count.textContent = 'Masa penyimpanan dokumen telah berakhir.';
    nodes.deletion.textContent = 'Dokumen telah dihapus sesuai kebijakan retensi 90 hari dan tidak lagi tersedia untuk diunduh.';
    return;
  }
  let seconds = request.remainingSeconds ?? 0;
  const tick = () => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    nodes.count.textContent = seconds < 86400
      ? 'Masa unduh hampir berakhir.'
      : days < 7
        ? 'Segera unduh dokumen Anda.'
        : `File Anda masih tersedia selama ${days} hari.`;
    nodes.deletion.textContent = `File akan dihapus ${seconds < 86400
      ? `dalam ${hours} jam ${minutes} menit`
      : `otomatis pada ${date(request.retentionExpiresAt)}`}.`;
    seconds = Math.max(0, seconds - 60);
  };
  tick();
  setInterval(tick, 60000);
}

function date(value) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value));
}
