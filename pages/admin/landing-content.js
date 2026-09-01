import { api } from '../../services/api-client.js';
import { authService } from '../../services/auth-service.js';

const root = document.querySelector('[data-landing-content-admin-root]');
const sections = [
  ['Hero', [['heroEyebrow', 'Eyebrow'], ['heroTitle', 'Judul utama'], ['heroLead', 'Deskripsi'], ['heroPrimaryCta', 'CTA utama'], ['heroSecondaryCta', 'CTA kedua']]],
  ['Profil', [['moreKicker', 'Kicker'], ['moreTitle', 'Judul'], ['moreBody', 'Deskripsi']]],
  ['LinkedIn', [['socialKicker', 'Kicker'], ['socialTitle', 'Judul'], ['socialQuote', 'Kutipan'], ['socialBody', 'Deskripsi']]],
  ['Cara kerja', [['stepsKicker', 'Kicker'], ['stepsTitle', 'Judul']]],
  ['Paket', [['plansKicker', 'Kicker'], ['plansTitle', 'Judul'], ['plansBody', 'Deskripsi']]],
  ['Keamanan', [['securityKicker', 'Kicker'], ['securityTitle', 'Judul'], ['securityBody', 'Deskripsi']]],
  ['CTA akhir', [['finalKicker', 'Kicker'], ['finalTitle', 'Judul'], ['finalBody', 'Deskripsi'], ['finalPrimaryCta', 'CTA utama'], ['finalSecondaryCta', 'CTA kedua']]],
];

const heading = document.createElement('header');
heading.className = 'dashboard-panel p-6';
const title = document.createElement('h1'); title.className = 'text-3xl font-black'; title.textContent = 'Landing Page Content';
const lead = document.createElement('p'); lead.className = 'mt-2 max-w-3xl text-slate-300'; lead.textContent = 'Ubah wording halaman utama secara terkontrol. HTML, script, dan tautan tidak diterima. Publikasi memerlukan sesi login terbaru serta alasan perubahan.';
const back = document.createElement('a'); back.className = 'dashboard-action mt-4 inline-block'; back.href = '/admin/'; back.textContent = '← Kembali ke dashboard';
heading.append(title, lead, back);
const status = document.createElement('p'); status.className = 'mt-4 text-slate-300'; status.textContent = 'Memuat konten terotorisasi…';
root.append(heading, status);

void load();

async function load() {
  try {
    const { user } = await authService.current();
    const roles = Array.isArray(user.roles) ? user.roles : [user.role];
    if (!roles.includes('super_admin')) { location.replace(roles.includes('cv_specialist') ? '/specialist/' : '/app/'); return; }
    render(await api.get('/admin/landing-content'));
  } catch (error) {
    if (error.status === 401) { location.replace('/login/'); return; }
    status.textContent = error.message || 'Konten tidak dapat dimuat.';
  }
}

function render(content) {
  const form = document.createElement('form'); form.className = 'dashboard-panel mt-6 p-6';
  for (const [section, fields] of sections) {
    const fieldset = document.createElement('fieldset'); fieldset.className = 'mb-7 border-b border-white/10 pb-6 last:border-0';
    const legend = document.createElement('legend'); legend.className = 'text-xl font-black'; legend.textContent = section; fieldset.append(legend);
    for (const [key, label] of fields) fieldset.append(createField(key, label, content[key] || ''));
    form.append(fieldset);
  }
  const reasonLabel = document.createElement('label'); reasonLabel.className = 'block font-bold'; reasonLabel.textContent = 'Alasan perubahan (wajib, min. 10 karakter)';
  const reason = document.createElement('textarea'); reason.name = 'reason'; reason.required = true; reason.minLength = 10; reason.maxLength = 300; reason.rows = 3; reason.className = 'mt-2 block w-full rounded border border-white/20 bg-slate-900 p-3';
  const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'dashboard-action mt-5'; submit.textContent = 'Publikasikan wording';
  form.append(reasonLabel, reason, submit); root.append(form);
  status.textContent = 'Perubahan belum dipublikasikan.';
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.confirm('Publikasikan perubahan wording ke landing page?')) return;
    submit.disabled = true;
    try {
      const values = new FormData(form); const next = {};
      for (const [, fields] of sections) for (const [key] of fields) next[key] = String(values.get(key) || '').trim();
      await api.put('/admin/landing-content', { content: next, reason: String(values.get('reason') || '').trim() });
      status.textContent = 'Wording berhasil dipublikasikan dan dicatat pada audit log.';
      reason.value = '';
    } catch (error) { status.textContent = error.message || 'Publikasi gagal.'; }
    finally { submit.disabled = false; }
  });
}

function createField(key, label, value) {
  const wrapper = document.createElement('label'); wrapper.className = 'mt-4 block';
  const caption = document.createElement('span'); caption.className = 'font-semibold'; caption.textContent = label;
  const multiline = /Title|Lead|Body|Quote/.test(key);
  const control = document.createElement(multiline ? 'textarea' : 'input');
  const maxLength = key.includes('Cta') ? 60 : key.includes('Kicker') ? 80 : key === 'stepsTitle' ? 120 : key.includes('Quote') ? 400 : key.includes('Title') ? 180 : 500;
  control.name = key; control.required = true; control.maxLength = maxLength; control.value = value;
  if (control instanceof HTMLTextAreaElement) control.rows = key.includes('Title') ? 2 : 3;
  control.className = 'mt-2 block w-full rounded border border-white/20 bg-slate-900 p-3';
  wrapper.append(caption, control); return wrapper;
}
