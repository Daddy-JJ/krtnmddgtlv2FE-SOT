import { resumeService } from '../../services/resume-service.js';

const metrics = document.querySelector('[data-metrics]');
const body = document.querySelector('[data-queue]');
const status = document.querySelector('[data-status]');
const search = document.querySelector('[data-search]');
const title = document.querySelector('[data-title]');
let rows = [];
search?.setAttribute('aria-label', 'Cari request Resume Services');

init();

async function init() {
  try {
    const [stats, queue] = await Promise.all([
      resumeService.statistics(),
      resumeService.adminQueue(),
    ]);
    rows = queue;
    metrics.replaceChildren(
      ...[
        ['Users', stats.totalUsers],
        ['Active resume', stats.activeResumeRequests],
        ['SLA breached', stats.slaBreached],
        ['Failed email', stats.failedEmail],
      ].map(metric),
    );
    render();
  } catch (error) {
    status.textContent = error.message;
  }
}

search.addEventListener('input', render);

function render() {
  const query = search.value.toLowerCase();
  const view = new URLSearchParams(location.search).get('view') ?? 'queue';
  title.textContent = view.replaceAll('-', ' ');
  const filtered = rows.filter(
    (item) => filterView(item, view) && JSON.stringify(item).toLowerCase().includes(query),
  );
  body.replaceChildren(...filtered.map(row));
  status.textContent = `${filtered.length} request ditampilkan.`;
}

function filterView(item, view) {
  if (view === 'queue') return true;
  if (view === 'assigned') return Boolean(item.assignedSpecialist);
  if (view === 'need-information') return item.status === 'NEED_MORE_INFORMATION';
  if (view === 'in-progress') return ['DATA_COMPLETE', 'IN_PROGRESS'].includes(item.status);
  if (view === 'quality-review') return item.status === 'READY_FOR_REVIEW';
  if (view === 'revisions') return String(item.status).includes('REVISION');
  if (view === 'completed') return item.status === 'COMPLETED';
  if (view === 'retention') return ['COMPLETED', 'EXPIRED'].includes(item.status);
  return true;
}

function metric([label, value]) {
  const element = document.createElement('article');
  const labelElement = document.createElement('p');
  const valueElement = document.createElement('p');
  element.className = 'dashboard-panel p-5';
  labelElement.className = 'text-sm text-slate-400';
  valueElement.className = 'mt-2 text-2xl font-black';
  labelElement.textContent = label;
  valueElement.textContent = value ?? 0;
  element.append(labelElement, valueElement);
  return element;
}

function row(item) {
  const tr = document.createElement('tr');
  tr.className = 'border-t border-white/10';
  const idLink = document.createElement('a');
  idLink.href = `/admin/resume-services/request/?id=${encodeURIComponent(item.publicId)}`;
  idLink.className = 'text-cyan-300 underline-offset-4 hover:underline';
  idLink.textContent = String(item.publicId).slice(0, 8);
  const values = [
    idLink,
    `${item.accountUser} / ${item.beneficiary}`,
    `${item.targetRole} · ${item.careerLevel}`,
    item.status,
    item.assignedSpecialist ?? 'Unassigned',
    item.slaDue ? new Date(item.slaDue).toLocaleString('id-ID') : '-',
    `${item.revisionCount}/3`,
    item.priority,
  ];
  for (const value of values) {
    const td = document.createElement('td');
    td.className = 'px-2 py-3 align-top';
    if (value instanceof Node) td.append(value);
    else td.textContent = value;
    tr.append(td);
  }
  return tr;
}
