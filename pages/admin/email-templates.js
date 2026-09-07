import { emailTemplateService } from '../../services/email-template-service.js';
import { safeHttpUrl } from '../../utils/safe-url.js';
import { validateEmailTemplateContent } from '../../validators/email-template-validator.js';

export async function renderEmailTemplateManager({ content, status }) {
  const manager = new EmailTemplateManager(content, status);
  await manager.start();
}

class EmailTemplateManager {
  constructor(container, status) {
    this.container = container;
    this.status = status;
    this.catalog = [];
    this.detail = null;
    this.content = null;
    this.dirty = false;
    this.testJob = null;
    this.history = null;
    this.versionRecord = null;
  }

  async start() {
    this.status.textContent = 'Memuat katalog template email...';
    this.catalog = await emailTemplateService.list();
    this.render();
    if (this.catalog[0]) await this.select(this.catalog[0].key);
  }

  async select(key) {
    if (this.dirty && key !== this.detail?.key && !window.confirm('Buang perubahan draft yang belum disimpan dan pindah template?')) return;
    this.status.textContent = 'Memuat draft template...';
    this.detail = await emailTemplateService.detail(key);
    this.content = structuredClone(this.detail.content);
    this.dirty = false;
    this.testJob = null;
    this.history = null;
    this.versionRecord = null;
    this.render();
    this.status.textContent = 'Draft dimuat. Perubahan hanya berlaku setelah dipublikasikan.';
  }

  render() {
    const layout = node('div', 'grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)]');
    const catalog = node('aside', 'rounded-2xl border border-white/10 p-4');
    catalog.append(node('h2', 'text-lg font-black', 'Template transaksional'));
    for (const item of this.catalog) {
      const button = node('button', 'dashboard-action mt-3 block w-full text-left');
      button.type = 'button';
      button.textContent = item.label;
      button.setAttribute('aria-current', item.key === this.detail?.key ? 'page' : 'false');
      button.addEventListener('click', () => this.select(item.key).catch(error => this.fail(error)));
      catalog.append(button);
    }
    const workspace = node('section', 'min-w-0');
    if (!this.detail) workspace.append(node('p', '', 'Pilih template untuk mulai mengedit.'));
    else workspace.append(this.editor());
    layout.append(catalog, workspace);
    this.container.replaceChildren(layout);
  }

  editor() {
    const wrapper = node('div', 'space-y-5');
    const meta = node('section', 'rounded-2xl border border-white/10 p-5');
    meta.append(
      node('h2', 'text-2xl font-black', this.detail.label),
      node('p', 'mt-2 text-sm text-slate-300', `Key: ${this.detail.key} | Draft: ${this.detail.draftRevision.slice(0, 8)} | Published: ${this.detail.publishedVersion ?? 'belum ada'}`),
    );
    const fields = node('div', 'mt-5 grid gap-4');
    fields.append(
      this.textField('Subject', 'subject', this.detail.limits.subject, true),
      this.textField('Preheader', 'preheader', this.detail.limits.preheader),
      this.textField('Heading', 'heading', this.detail.limits.heading),
      this.textField('Footer', 'footer', this.detail.limits.footer, false, true),
    );
    meta.append(fields, this.styleFields());

    const blocks = node('section', 'rounded-2xl border border-white/10 p-5');
    const blockHead = node('div', 'flex flex-wrap items-center justify-between gap-3');
    blockHead.append(node('h2', 'text-xl font-black', 'Isi dan format'));
    const addParagraph = action('Tambah paragraf', () => this.change(() => {
      this.content.blocks.push({ type: 'paragraph', parts: [{ text: '', emphasis: 'normal' }] });
    }));
    blockHead.append(addParagraph);
    blocks.append(blockHead, this.blockList(), this.requiredBlockControls());

    const actions = node('section', 'rounded-2xl border border-white/10 p-5');
    actions.append(node('h2', 'text-xl font-black', 'Validasi dan publikasi'));
    const row = node('div', 'mt-4 flex flex-wrap gap-3');
    row.append(
      action('Simpan draft', () => this.save()),
      action('Preview tersimpan', () => this.preview()),
      action('Kirim email uji', () => this.testSend()),
      action('Publikasikan', () => this.publish()),
      action('Riwayat versi', () => this.loadHistory()),
    );
    actions.append(row);
    if (this.testJob) actions.append(this.testStatusPanel());
    if (this.history) actions.append(this.historyPanel());

    const preview = node('section', 'rounded-2xl border border-white/10 p-5');
    preview.dataset.emailPreview = '';
    preview.append(node('h2', 'text-xl font-black', 'Preview backend'));
    wrapper.append(meta, blocks, actions, preview);
    return wrapper;
  }

  textField(label, key, max, required = false, multiline = false) {
    const wrap = node('label', 'block');
    wrap.append(node('span', 'text-sm font-bold', `${label} (maks. ${max})`));
    const input = document.createElement(multiline ? 'textarea' : 'input');
    input.className = 'mt-1 block w-full rounded border border-white/20 px-3 py-2';
    input.value = this.content[key];
    input.maxLength = max;
    input.required = required;
    input.addEventListener('input', () => { this.content[key] = input.value; this.markDirty(); });
    wrap.append(input);
    return wrap;
  }

  styleFields() {
    const panel = node('fieldset', 'mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4');
    panel.append(node('legend', 'font-bold', 'Tampilan email'));
    for (const [label, key] of [['Background', 'backgroundColor'], ['Teks', 'textColor'], ['Aksen', 'accentColor']]) {
      const wrap = node('label', 'block');
      wrap.append(node('span', 'text-sm', label));
      const input = document.createElement('input');
      input.type = 'color'; input.value = this.content.style[key]; input.className = 'mt-1 block h-10 w-full';
      input.addEventListener('input', () => { this.content.style[key] = input.value; this.markDirty(); });
      wrap.append(input); panel.append(wrap);
    }
    const logo = node('label', 'block text-sm');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.checked = this.content.style.logoAssetKey === 'brand';
    checkbox.addEventListener('change', () => { this.content.style.logoAssetKey = checkbox.checked ? 'brand' : null; this.markDirty(); });
    logo.append(checkbox, document.createTextNode(' Gunakan logo brand'));
    const alt = document.createElement('input');
    alt.placeholder = 'Teks alternatif logo'; alt.value = this.content.style.logoAlt; alt.maxLength = 160;
    alt.className = 'mt-2 block w-full rounded border border-white/20 px-2 py-1';
    alt.addEventListener('input', () => { this.content.style.logoAlt = alt.value; this.markDirty(); });
    logo.append(alt); panel.append(logo);
    return panel;
  }

  blockList() {
    const list = node('div', 'mt-4 space-y-4');
    this.content.blocks.forEach((block, index) => {
      const card = node('article', 'rounded-xl border border-white/10 p-4');
      const head = node('div', 'flex flex-wrap items-center justify-between gap-2');
      head.append(node('h3', 'font-black', blockTitle(block)));
      const controls = node('div', 'flex gap-2');
      if (index > 0) controls.append(action('Naik', () => this.move(index, -1)));
      if (index < this.content.blocks.length - 1) controls.append(action('Turun', () => this.move(index, 1)));
      if (block.type === 'paragraph') controls.append(action('Hapus', () => this.change(() => this.content.blocks.splice(index, 1))));
      head.append(controls); card.append(head);
      if (block.type === 'paragraph') card.append(this.paragraphEditor(block));
      if (block.type === 'action') card.append(this.actionEditor(block));
      if (block.type === 'system') card.append(node('p', 'mt-3 text-sm text-slate-300', `Konten keamanan wajib: ${block.key}. Teks final dimiliki backend dan tidak dapat dihapus.`));
      list.append(card);
    });
    if (!this.content.blocks.length) list.append(node('p', 'text-slate-300', 'Draft belum memiliki blok.'));
    return list;
  }

  paragraphEditor(block) {
    const panel = node('div', 'mt-3 space-y-3');
    block.parts.forEach((part, index) => {
      const row = node('div', 'grid gap-2 rounded border border-white/10 p-3 lg:grid-cols-[1fr_9rem_auto]');
      const value = Object.hasOwn(part, 'text') ? document.createElement('textarea') : document.createElement('select');
      value.className = 'rounded border border-white/20 px-2 py-2';
      if (Object.hasOwn(part, 'text')) {
        value.value = part.text; value.maxLength = this.detail.limits.paragraph;
        value.addEventListener('input', () => { part.text = value.value; this.markDirty(); });
      } else {
        for (const variable of this.detail.variables) value.append(option(variable.name, variable.name));
        value.value = part.variable;
        value.addEventListener('change', () => { part.variable = value.value; this.markDirty(); });
      }
      const emphasis = document.createElement('select');
      emphasis.className = 'rounded border border-white/20 px-2 py-2';
      for (const [key, label] of [['normal', 'Normal'], ['strong', 'Bold'], ['em', 'Italic']]) emphasis.append(option(key, label));
      emphasis.value = part.emphasis;
      emphasis.addEventListener('change', () => { part.emphasis = emphasis.value; this.markDirty(); });
      row.append(value, emphasis, action('Hapus bagian', () => this.change(() => block.parts.splice(index, 1))));
      panel.append(row);
    });
    const add = node('div', 'flex flex-wrap gap-2');
    add.append(action('Tambah teks', () => this.change(() => block.parts.push({ text: '', emphasis: 'normal' }))));
    if (this.detail.variables.length) add.append(action('Tambah variabel', () => this.change(() => block.parts.push({ variable: this.detail.variables[0].name, emphasis: 'normal' }))));
    panel.append(add);
    return panel;
  }

  actionEditor(block) {
    const wrap = node('label', 'mt-3 block');
    wrap.append(node('span', 'text-sm text-slate-300', `Tautan event wajib: ${block.targetVariable}`));
    const input = document.createElement('input');
    input.value = block.label; input.maxLength = this.detail.limits.label;
    input.className = 'mt-1 block w-full rounded border border-white/20 px-3 py-2';
    input.addEventListener('input', () => { block.label = input.value; this.markDirty(); });
    wrap.append(input); return wrap;
  }

  requiredBlockControls() {
    const missingActions = this.detail.actions.filter(key => !this.content.blocks.some(block => block.type === 'action' && block.targetVariable === key));
    const missingSystems = this.detail.systems.filter(key => !this.content.blocks.some(block => block.type === 'system' && block.key === key));
    const panel = node('div', 'mt-4 flex flex-wrap gap-2');
    for (const key of missingActions) panel.append(action(`Pulihkan aksi wajib: ${key}`, () => this.change(() => this.content.blocks.push({ type: 'action', targetVariable: key, label: actionLabel(key) }))));
    for (const key of missingSystems) panel.append(action(`Pulihkan keamanan wajib: ${key}`, () => this.change(() => this.content.blocks.push({ type: 'system', key }))));
    return panel;
  }

  move(index, offset) {
    this.change(() => {
      const [block] = this.content.blocks.splice(index, 1);
      this.content.blocks.splice(index + offset, 0, block);
    });
  }

  change(operation) {
    operation(); this.dirty = true; this.render();
    this.status.textContent = 'Perubahan belum disimpan.';
  }

  markDirty() {
    this.dirty = true;
    this.status.textContent = 'Perubahan belum disimpan.';
  }

  validate(complete) {
    const result = validateEmailTemplateContent(this.content, this.detail, { complete });
    if (!result.valid) {
      this.status.textContent = result.errors.join(' ');
      return false;
    }
    return true;
  }

  async save() {
    if (!this.validate(false)) return;
    try {
      const saved = await emailTemplateService.saveDraft(this.detail.key, this.detail.draftRevision, this.content);
      this.detail = { ...this.detail, ...saved };
      this.content = structuredClone(saved.content);
      this.dirty = false;
      this.render();
      this.status.textContent = 'Draft tersimpan. Preview dan publikasi sekarang memakai revision ini.';
    } catch (error) { this.fail(error); }
  }

  async preview() {
    if (this.dirty) { this.status.textContent = 'Simpan draft sebelum membuat preview.'; return; }
    if (!this.validate(true)) return;
    try {
      const preview = await emailTemplateService.preview(this.detail.key, this.detail.draftRevision);
      this.renderPreview(preview);
      this.status.textContent = 'Preview dibuat oleh renderer backend menggunakan data contoh dan tautan nonaktif.';
    } catch (error) { this.fail(error); }
  }

  async testSend() {
    if (this.dirty) { this.status.textContent = 'Simpan draft sebelum mengirim email uji.'; return; }
    if (!this.validate(true)) return;
    if (!window.confirm('Kirim email uji ke alamat terverifikasi Super Admin yang sedang login?')) return;
    try {
      this.testJob = await emailTemplateService.testSend(this.detail.key, this.detail.draftRevision);
      this.render();
      this.status.textContent = 'Email uji masuk antrean. Jalankan mail worker lalu periksa status.';
    } catch (error) { this.fail(error); }
  }

  async refreshTestStatus() {
    try {
      this.testJob = await emailTemplateService.testStatus(this.detail.key, this.testJob.testId);
      this.render();
      this.status.textContent = `Status email uji: ${this.testJob.status}. SMTP sent tidak menjamin inbox delivery.`;
    } catch (error) { this.fail(error); }
  }

  async publish() {
    if (this.dirty) { this.status.textContent = 'Simpan draft sebelum publikasi.'; return; }
    if (!this.validate(true)) return;
    const reason = window.prompt('Alasan publikasi (10-1000 karakter):');
    if (!reason || reason.trim().length < 10 || reason.trim().length > 1000) {
      this.status.textContent = 'Publikasi dibatalkan: alasan harus 10-1000 karakter.';
      return;
    }
    if (!window.confirm('Publikasikan revision ini untuk email baru berikutnya? Email yang sudah antre tidak berubah.')) return;
    try {
      await emailTemplateService.publish(this.detail.key, {
        draftRevision: this.detail.draftRevision,
        expectedPublishedVersion: this.detail.publishedVersion,
        reason: reason.trim(),
      });
      const key = this.detail.key;
      await this.select(key);
      this.status.textContent = 'Template dipublikasikan untuk event berikutnya.';
    } catch (error) { this.fail(error); }
  }

  async loadHistory() {
    try {
      this.history = await emailTemplateService.versions(this.detail.key);
      this.render();
      this.status.textContent = `${this.history.items.length} versi publikasi dimuat.`;
    } catch (error) { this.fail(error); }
  }

  async restore(version) {
    const reason = window.prompt(`Alasan menyalin versi ${version} menjadi draft (10-1000 karakter):`);
    if (!reason || reason.trim().length < 10 || reason.trim().length > 1000) {
      this.status.textContent = 'Restore dibatalkan: alasan harus 10-1000 karakter.';
      return;
    }
    if (!window.confirm(`Salin versi ${version} menjadi draft baru? Versi live tidak berubah.`)) return;
    try {
      const saved = await emailTemplateService.restore(this.detail.key, {
        version,
        expectedRevision: this.detail.draftRevision,
        reason: reason.trim(),
      });
      this.detail = { ...this.detail, ...saved };
      this.content = structuredClone(saved.content);
      this.dirty = false;
      this.history = null;
      this.render();
      this.status.textContent = `Versi ${version} disalin menjadi draft. Review lalu publikasikan secara terpisah.`;
    } catch (error) { this.fail(error); }
  }

  fail(error) {
    if (error?.code === 'EMAIL_TEMPLATE_CONFLICT') {
      this.status.textContent = 'Draft berubah di sesi lain. Muat ulang template dan rekonsiliasi perubahan.';
      return;
    }
    if (error?.code === 'RECENT_AUTH_REQUIRED') {
      this.status.textContent = 'Login terbaru diperlukan untuk aksi sensitif ini.';
      return;
    }
    this.status.textContent = error?.message ?? 'Operasi template email gagal.';
  }

  renderPreview(preview) {
    const host = this.container.querySelector('[data-email-preview]');
    if (!host) return;
    const doc = preview.document;
    const card = node('article', 'mt-4 rounded-xl border p-6');
    card.style.backgroundColor = doc.style.backgroundColor;
    card.style.color = doc.style.textColor;
    if (doc.banner) card.append(node('p', 'mb-3 text-sm font-black', doc.banner));
    if (doc.logoUrl) {
      const safeLogo = safeHttpUrl(doc.logoUrl);
      const image = document.createElement('img');
      image.src = safeLogo; image.alt = doc.style.logoAlt; image.width = 160;
      image.className = 'mb-4 h-auto max-w-[10rem]';
      card.append(image);
    }
    if (doc.preheader) card.append(node('p', 'text-xs opacity-70', doc.preheader));
    if (doc.heading) card.append(node('h3', 'mt-2 text-2xl font-black', doc.heading));
    for (const block of doc.blocks) {
      if (block.type === 'action') {
        const button = node('span', 'mt-4 inline-block rounded px-4 py-2 font-bold', block.label);
        button.style.backgroundColor = doc.style.accentColor;
        button.setAttribute('aria-disabled', 'true');
        card.append(button);
        continue;
      }
      const paragraph = node('p', 'mt-4');
      for (const part of block.parts ?? []) {
        const tag = part.emphasis === 'strong' ? 'strong' : part.emphasis === 'em' ? 'em' : 'span';
        paragraph.append(node(tag, '', part.text));
      }
      card.append(paragraph);
    }
    if (doc.footer) card.append(node('p', 'mt-6 text-sm opacity-80', doc.footer));
    const plain = document.createElement('pre');
    plain.className = 'mt-5 whitespace-pre-wrap rounded border border-white/10 p-3 text-xs';
    plain.textContent = preview.plainText;
    host.replaceChildren(node('h2', 'text-xl font-black', preview.subject), card, node('h3', 'mt-5 font-bold', 'Plain text'), plain);
  }

  testStatusPanel() {
    const panel = node('div', 'mt-5 rounded-xl border border-white/10 p-4');
    panel.append(
      node('p', 'font-bold', `Email uji: ${this.testJob.status}`),
      node('p', 'text-sm text-slate-300', `Penerima: ${this.testJob.maskedRecipient} | ID: ${this.testJob.testId}`),
      action('Periksa status', () => this.refreshTestStatus()),
    );
    if (this.testJob.errorCode) panel.append(node('p', 'mt-2 text-sm', `Error: ${this.testJob.errorCode}`));
    return panel;
  }

  historyPanel() {
    const panel = node('div', 'mt-5 rounded-xl border border-white/10 p-4');
    panel.append(node('h3', 'font-black', 'Riwayat publikasi'));
    for (const item of this.history.items) {
      const row = node('div', 'mt-3 flex flex-wrap items-center gap-3 border-t border-white/10 pt-3');
      row.append(
        node('span', 'text-sm', `Versi ${item.version} | ${item.reason} | ${formatDate(item.createdAt)}`),
        action('Lihat', () => this.viewVersion(item.version)),
        action('Salin ke draft', () => this.restore(item.version)),
      );
      panel.append(row);
    }
    if (!this.history.items.length) panel.append(node('p', 'mt-3 text-sm text-slate-300', 'Belum ada versi yang dipublikasikan.'));
    if (this.versionRecord) {
      const record = node('section', 'mt-4 rounded border border-white/10 p-3');
      record.append(
        node('h4', 'font-bold', `Versi ${this.versionRecord.version}: ${this.versionRecord.content.subject}`),
        node('p', 'mt-2 text-sm', this.versionRecord.content.heading || 'Tanpa heading'),
        node('p', 'mt-2 text-xs text-slate-300', `Alasan: ${this.versionRecord.reason}`),
      );
      panel.append(record);
    }
    return panel;
  }

  async viewVersion(version) {
    try {
      this.versionRecord = await emailTemplateService.version(this.detail.key, version);
      this.render();
      this.status.textContent = `Versi immutable ${version} dimuat untuk pemeriksaan.`;
    } catch (error) { this.fail(error); }
  }
}

function node(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== '') element.textContent = text;
  return element;
}

function action(label, handler) {
  const button = node('button', 'dashboard-action', label);
  button.type = 'button';
  button.addEventListener('click', () => Promise.resolve(handler()).catch(() => {}));
  return button;
}

function option(value, label) {
  const item = document.createElement('option');
  item.value = value; item.textContent = label;
  return item;
}

function blockTitle(block) {
  if (block.type === 'paragraph') return 'Paragraf editable';
  if (block.type === 'action') return `Tombol: ${block.targetVariable}`;
  return `Pemberitahuan sistem: ${block.key}`;
}

function actionLabel(key) {
  if (key === 'cardUrl') return 'Kartu Anda';
  if (key === 'manageUrl') return 'Kelola kartu';
  if (key === 'resetUrl') return 'Reset password';
  return 'Buka member area';
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('id-ID');
}
