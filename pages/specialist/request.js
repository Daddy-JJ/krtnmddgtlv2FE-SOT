import { authService } from '../../services/auth-service.js';
import { resumeService } from '../../services/resume-service.js';

const id = new URLSearchParams(location.search).get('id');
const heading = document.querySelector('[data-heading]');
const summaryLine = document.querySelector('[data-summary]');
const sections = document.querySelector('[data-sections]');
const status = document.querySelector('[data-status]');
const uploadForm = document.querySelector('[data-upload-form]');
const actionButtons = [...document.querySelectorAll('[data-action]')];
let currentStatus = '';

const logout = document.querySelector('[data-logout]');
logout?.addEventListener('click', async () => {
  logout.disabled = true;
  status.textContent = 'Keluar dari akun…';
  try {
    await authService.logout();
    location.assign('/login/');
  } catch (error) {
    status.textContent = error.message || 'Logout gagal. Sesi masih aktif.';
    logout.disabled = false;
  }
});

for (const button of actionButtons) {
  button.addEventListener('click', async () => {
    const action = button.dataset.action;
    const reason = window.prompt(action === 'information' ? 'Informasi yang diperlukan (min. 10 karakter):' : 'Catatan perubahan status:');
    if (!reason) return;
    button.disabled = true;
    try {
      if (action === 'information') await resumeService.requestInformation(id, reason);
      if (action === 'complete-data') await resumeService.markDataComplete(id, reason);
      if (action === 'start') {
        if (currentStatus === 'REVISION_REQUESTED') await resumeService.startRevision(id, reason);
        else await resumeService.start(id, reason);
      }
      await load();
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
}

uploadForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(uploadForm);
  const file = form.get('file');
  const role = String(form.get('role'));
  if (!(file instanceof File)) return;
  const submit = uploadForm.querySelector('button');
  submit.disabled = true;
  try {
    const uploaded = await resumeService.upload(id, role, file);
    if (role === 'DELIVERABLE') await resumeService.registerDeliverable(id, {
      filePublicId: uploaded.publicId,
      releaseNotes: String(form.get('releaseNotes') || 'Deliverable candidate'),
      internalNotes: String(form.get('internalNotes') || '') || null,
    });
    uploadForm.reset();
    await load();
  } catch (error) { status.textContent = error.message; }
  finally { submit.disabled = false; }
});

void init();
async function init() {
  if (!id) { status.textContent = 'Request ID tidak valid.'; return; }
  try {
    const { user: actor } = await authService.current();
    const roles = Array.isArray(actor.roles) ? actor.roles : [actor.role];
    if (!roles.includes('cv_specialist') || roles.includes('super_admin')) { location.replace(roles.includes('super_admin') ? '/admin/' : '/app/'); return; }
    await load();
  } catch (error) {
    if (error.status === 401) location.replace('/login/'); else status.textContent = error.message;
  }
}

async function load() {
  const data = await resumeService.adminDetail(id);
  const request = data.summary;
  currentStatus = request.status;
  const allowedActions = {
    SUBMITTED: ['information', 'complete-data'], ASSIGNED: ['information', 'complete-data'],
    NEED_MORE_INFORMATION: ['complete-data'], DATA_COMPLETE: ['start'],
    IN_PROGRESS: ['information'], REVISION_REQUESTED: ['start'], REVISION_IN_PROGRESS: ['information'],
  }[request.status] ?? [];
  for (const button of actionButtons) button.hidden = !allowedActions.includes(button.dataset.action);
  uploadForm.hidden = !['IN_PROGRESS', 'REVISION_IN_PROGRESS'].includes(request.status);
  heading.textContent = `${request.beneficiary} · ${request.targetRole}`;
  summaryLine.textContent = `${request.status} · ${request.assignedSpecialist ?? 'Unassigned'} · SLA ${date(request.slaDueAt)}`;
  sections.replaceChildren(
    panel('Profil dan kontak user', request, ['beneficiary', 'accountUser', 'whatsappNumber', 'linkedinUrl']),
    panel('Profil karier', request, ['currentJobTitle', 'currentOrganization', 'experienceYears', 'careerLevel']),
    panel('Target pekerjaan', request, ['targetRole', 'targetIndustry', 'targetCompany', 'targetCountry', 'language', 'resumeStyle']),
    panel('Materi dan catatan user', request, ['pastedResumeText', 'pastedJobDescription', 'additionalAchievements', 'certifications', 'userNotes']),
    filePanel('File resume dan lampiran privat', data.files),
    listPanel('Messages', data.messages, (item) => `${item.sender}: ${item.message}`),
    listPanel('Deliverables', data.deliverables, (item) => `v${item.versionNumber} · ${item.filename} · ${item.state}`),
    listPanel('Revisions', data.revisions, (item) => `#${item.revisionNumber} · ${item.status}`),
    listPanel('SLA', data.sla, (item) => `${item.eventType} · ${date(item.eventAt)}`),
  );
  status.textContent = 'Request assigned berhasil dimuat. Deliverable masuk ke quality review; user hanya dapat mengunduh file setelah release resmi.';
}

function panel(title, value, keys) {
  const section = document.createElement('section'); section.className = 'dashboard-panel p-5';
  const h2 = document.createElement('h2'); h2.className = 'text-xl font-black'; h2.textContent = title; section.append(h2);
  for (const key of keys) { const p = document.createElement('p'); p.className = 'mt-3 break-words'; p.textContent = `${key}: ${value[key] ?? '—'}`; section.append(p); }
  return section;
}
function listPanel(title, items, format) {
  const section = document.createElement('section'); section.className = 'dashboard-panel p-5';
  const h2 = document.createElement('h2'); h2.className = 'text-xl font-black'; h2.textContent = title; section.append(h2);
  const list = document.createElement('ul');
  if (!items.length) { const item = document.createElement('li'); item.className = 'mt-3'; item.textContent = 'Belum ada data.'; list.append(item); }
  for (const value of items) { const item = document.createElement('li'); item.className = 'mt-3 border-t border-white/10 pt-3'; item.textContent = format(value); list.append(item); }
  section.append(list); return section;
}
function filePanel(title, items) {
  const section = document.createElement('section'); section.className = 'dashboard-panel p-5';
  const h2 = document.createElement('h2'); h2.className = 'text-xl font-black'; h2.textContent = title; section.append(h2);
  const list = document.createElement('ul');
  if (!items.length) { const item = document.createElement('li'); item.className = 'mt-3'; item.textContent = 'Belum ada data.'; list.append(item); }
  for (const value of items) {
    const item = document.createElement('li'); item.className = 'mt-3 border-t border-white/10 pt-3';
    const link = document.createElement('a'); link.className = 'text-cyan-300 hover:underline';
    link.href = resumeService.fileDownloadUrl(id, value.publicId);
    link.textContent = `${value.role} · ${value.filename} · ${value.scanStatus}`;
    item.append(link); list.append(item);
  }
  section.append(list); return section;
}
function date(value) { return value ? new Date(value).toLocaleString('id-ID') : '—'; }
