import { resumeService } from '../../services/resume-service.js';

const publicId = new URLSearchParams(location.search).get('id');
const heading = document.querySelector('[data-heading]');
const summaryLine = document.querySelector('[data-summary]');
const sections = document.querySelector('[data-sections]');
const status = document.querySelector('[data-status]');
const uploadForm=document.querySelector('[data-upload-form]');
const qualityForm=document.querySelector('[data-quality-form]');

if (!publicId) {
  status.textContent = 'Request ID tidak valid.';
} else {
  load();
}

uploadForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const data=new FormData(uploadForm),file=data.get('file'),role=String(data.get('role'));
  if(!(file instanceof File))return;
  try{
    const uploaded=await resumeService.upload(publicId,role,file);
    if(role==='DELIVERABLE'){
      const candidate=await resumeService.registerDeliverable(publicId,{
        filePublicId:uploaded.publicId,
        releaseNotes:String(data.get('releaseNotes')||'Final candidate'),
        internalNotes:String(data.get('internalNotes')||'')||null,
      });
      qualityForm.elements.deliverablePublicId.value=candidate.publicId;
    }
    uploadForm.reset();
    await load();
  }catch(error){status.textContent=error.message;}
});

qualityForm.addEventListener('submit',async(event)=>{
  event.preventDefault();
  const data=new FormData(qualityForm);
  if(!window.confirm('Release dokumen ini kepada user dan mulai retensi 90 hari?'))return;
  try{
    const names=['beneficiaryCorrect','factualIntegrityChecked','spellingFormattingChecked','fileOpens','noMacros','noTrackedChangesComments','noPlaceholders','readyForRelease'];
    const checks=Object.fromEntries(names.map(name=>[name,data.get(name)==='on']));
    await resumeService.release(publicId,{deliverablePublicId:String(data.get('deliverablePublicId')),checks,notes:String(data.get('notes')||'')||undefined});
    await load();
  }catch(error){status.textContent=error.message;}
});

async function load() {
  try {
    const data = await resumeService.adminDetail(publicId);
    const summary = data.summary;
    heading.textContent = `${summary.beneficiary} · ${summary.targetRole}`;
    summaryLine.textContent = `${summary.accountUser} · ${summary.status} · ${summary.assignedSpecialist ?? 'Unassigned'}`;
    sections.replaceChildren(
      panel('summary', 'Request Summary', entries({
        ID: summary.publicId,
        Status: summary.status,
        Priority: summary.priority,
        'Revision used': `${summary.revisionCount}/${summary.maxRevisions}`,
        'SLA due': date(summary.slaDueAt),
        Retention: date(summary.retentionExpiresAt),
      })),
      panel('brief', 'Career Brief', entries({
        'Current role': summary.currentJobTitle,
        Organization: summary.currentOrganization,
        Experience: summary.experienceYears,
        'Career level': summary.careerLevel,
        'Target role': summary.targetRole,
        Industry: summary.targetIndustry,
        Company: summary.targetCompany,
        Country: summary.targetCountry,
        Language: summary.language,
        Style: summary.resumeStyle,
      })),
      panel('files', 'Source Documents', fileList(data.files)),
      panel('messages', 'Messages', list(data.messages, (item) => `${item.sender}: ${item.message}`)),
      panel('deliverables', 'Deliverables', list(data.deliverables, (item) => `v${item.versionNumber} · ${item.filename} · ${item.state}`)),
      panel('revisions', 'Revisions', list(data.revisions, (item) => `#${item.revisionNumber} · ${item.status} · ${item.userNotes}`)),
      panel('sla', 'SLA History', list(data.sla, (item) => `${item.eventType} · ${date(item.eventAt)} · ${item.reason ?? ''}`)),
      panel('audit', 'Audit Timeline', list(data.audit, (item) => `${item.fromStatus ?? '—'} → ${item.toStatus} · ${item.actor}`)),
    );
    status.textContent = 'Workspace siap. Data dokumen hanya ditampilkan pada request yang terotorisasi.';
  } catch (error) {
    status.textContent = error.message;
  }
}

for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('click', async () => {
    const action = button.dataset.action;
    const promptMessage = action === 'information'
      ? 'Tulis informasi yang masih diperlukan (min. 10 karakter):'
      : 'Alasan/catatan perubahan status:';
    const reason = window.prompt(promptMessage);
    if (!reason) return;
    try {
      if (action === 'information') await resumeService.requestInformation(publicId, reason);
      if (action === 'complete-data') await resumeService.markDataComplete(publicId, reason);
      if (action === 'start') await resumeService.start(publicId, reason);
      await load();
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

function panel(id, title, content) {
  const element = document.createElement('section');
  const headingElement = document.createElement('h2');
  element.id = id;
  element.className = 'dashboard-panel p-5';
  headingElement.className = 'text-xl font-black';
  headingElement.textContent = title;
  element.append(headingElement, content);
  return element;
}

function entries(values) {
  const dl = document.createElement('dl');
  dl.className = 'mt-4 grid gap-3 text-sm';
  for (const [label, value] of Object.entries(values)) {
    const row = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    row.className = 'border-t border-white/10 pt-3';
    dt.className = 'text-slate-400';
    dd.className = 'mt-1 break-words';
    dt.textContent = label;
    dd.textContent = value ?? '—';
    row.append(dt, dd);
    dl.append(row);
  }
  return dl;
}

function list(items, format) {
  const ul = document.createElement('ul');
  ul.className = 'mt-4 space-y-3 text-sm';
  if (!items.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Belum ada data.';
    ul.append(empty);
  }
  for (const item of items) {
    const li = document.createElement('li');
    li.className = 'border-t border-white/10 pt-3 break-words';
    li.textContent = format(item);
    ul.append(li);
  }
  return ul;
}

function fileList(items){
  const ul=list([],()=> '');
  ul.replaceChildren();
  if(!items.length){const empty=document.createElement('li');empty.textContent='Belum ada data.';ul.append(empty);}
  for(const item of items){
    const li=document.createElement('li'),link=document.createElement('a');
    li.className='border-t border-white/10 pt-3 break-words';
    link.className='text-cyan-300 underline-offset-4 hover:underline';
    link.href=resumeService.fileDownloadUrl(publicId,item.publicId);
    link.textContent=`${item.role} · ${item.filename} · ${item.scanStatus}`;
    li.append(link);ul.append(li);
  }
  return ul;
}

function date(value) {
  return value ? new Date(value).toLocaleString('id-ID') : '—';
}
