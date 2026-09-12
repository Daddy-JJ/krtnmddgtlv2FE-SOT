import { cardService } from '../../services/card-service.js';
import { buildCardInput, validateCardInput } from '../../validators/card-validator.js';
import { clearFieldErrors, formValues, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';
import { mountCardLivePreview } from '../../components/card-live-preview.js';
import { bindWebsiteUrlInput } from '../../utils/website-url.js';

const form = document.querySelector('[data-card-editor-form]');
const status = document.querySelector('[data-form-status]');
const previewStage = document.querySelector('[data-card-live-preview]');
const previewStatus = document.querySelector('[data-card-live-preview-status]');
const whatsappPreview = document.querySelector('[data-whatsapp-preview]');
const section = form?.dataset.editorSection ?? 'card';
const editableFields = [
  'firstName', 'lastName', 'jobTitle', 'organization',
  'officePhone', 'mobilePhone', 'email', 'websiteUrl',
  'addressStreet', 'addressCity', 'addressProvince', 'addressPostalCode', 'addressCountry',
  'mapsUrl',
];
const state = { card: null, preview: null };

init();
bindWebsiteUrlInput(form?.elements.websiteUrl);

function init() {
  load();
  form?.addEventListener('submit', save);
  form?.addEventListener('input', updateLivePreview);
}

async function load() {
  if (!form) return;
  setBusy(form, true);
  showStatus(status, 'Memuat data kartu...', 'info');
  try {
    const cards = await cardService.list();
    const first = Array.isArray(cards) ? cards[0] : null;
    if (!first) {
      await loadLivePreview();
      showStatus(status, 'Belum ada kartu aktif. Isi form ini untuk membuat kartu Basic/Pro.', 'info');
      return;
    }
    state.card = await cardService.get(first.publicId);
    fillForm(state.card);
    await loadLivePreview();
    showStatus(status, 'Data kartu siap diedit.', 'success');
  } catch (error) {
    if (error.status === 401) {
      location.assign('/login/');
      return;
    }
    showStatus(status, error.message, 'error');
  } finally {
    setBusy(form, false);
  }
}

async function save(event) {
  event.preventDefault();
  const values = formValues(form);
  const input = buildCardInput(values, state.card, document.documentElement.lang);
  const errors = validateCardInput(input, editableFields);
  if (!String(values.firstName ?? '').trim()) errors.firstName = 'Nama depan wajib diisi.';
  if (!String(values.lastName ?? '').trim()) errors.lastName = 'Nama belakang wajib diisi.';
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    showStatus(status, 'Periksa field yang ditandai.', 'error');
    return;
  }
  clearFieldErrors(form);
  setBusy(form, true);
  showStatus(status, 'Menyimpan perubahan...', 'info');
  const creating = !state.card;
  try {
    state.card = state.card
      ? await cardService.update(state.card.publicId, input)
      : await cardService.create(input);
    fillForm(state.card);
    if (state.preview) state.preview.update(previewData());
    else await loadLivePreview();
    document.dispatchEvent(new CustomEvent('card:saved', { detail: { publicId: state.card.publicId, section } }));
    showStatus(status, creating ? 'Kartu berhasil dibuat.' : 'Perubahan tersimpan.', 'success');
  } catch (error) {
    showFieldErrors(form, mapApiFieldErrors(error.details));
    showStatus(status, error.message, 'error');
  } finally {
    setBusy(form, false);
  }
}

function fillForm(card) {
  const name = String(card.contact?.fullName ?? '').trim().replace(/\s+/g, ' ');
  const nameParts = name.split(' ').filter(Boolean);
  const address = String(card.contact?.addressText ?? '').split(/\r?\n|\|/).map((part) => part.trim());
  const values = {
    firstName: nameParts.shift() ?? '',
    lastName: nameParts.join(' '),
    jobTitle: card.contact?.jobTitle ?? '',
    organization: card.contact?.organization ?? '',
    officePhone: card.contact?.officePhone ?? '',
    mobilePhone: card.contact?.mobilePhone ?? '',
    email: card.contact?.email ?? '',
    websiteUrl: card.contact?.websiteUrl ?? '',
    addressStreet: address[0] ?? '',
    addressCity: address[1] ?? '',
    addressProvince: address[2] ?? '',
    addressPostalCode: address[3] ?? '',
    addressCountry: address[4] ?? '',
    mapsUrl: card.contact?.mapsUrl ?? '',
  };
  for (const field of editableFields) if (form.elements[field]) form.elements[field].value = values[field] ?? '';
  updateWhatsappPreview();
  updateLivePreview();
}

async function loadLivePreview() {
  if (!previewStage) return;
  showStatus(previewStatus, 'Memuat preview tema aktif...', 'info');
  try {
    state.preview?.destroy();
    state.preview = await mountCardLivePreview(previewStage, state.card?.themeCode, previewData());
    showStatus(previewStatus, 'Preview mengikuti perubahan form dan belum disimpan.', 'success');
  } catch {
    showStatus(previewStatus, 'Preview belum dapat dimuat. Form tetap dapat disimpan.', 'error');
  }
}

function updateLivePreview() {
  updateWhatsappPreview();
  state.preview?.update(previewData());
}

function previewData() {
  const values = form
    ? Object.fromEntries(editableFields.map((field) => [field, form.elements[field]?.value ?? '']))
    : {};
  const input = buildCardInput(values, state.card, document.documentElement.lang);
  const contact = input.contact;
  const canonicalUrl = state.card?.canonicalUrl
    ?? (state.card?.slug ? `${location.origin}/${encodeURIComponent(state.card.slug)}` : '');
  return {
    ...contact,
    canonicalUrl,
    logoUrl: state.card?.logoUrl ?? '',
    qrUrl: state.card?.qrImageUrl ?? '',
    socialLinks: Array.isArray(state.card?.socialLinks) ? state.card.socialLinks : [],
  };
}

function updateWhatsappPreview() {
  if (!whatsappPreview || !form) return;
  if (state.card?.planCode !== 'pro') {
    whatsappPreview.textContent = 'CTA WhatsApp tersedia khusus paket Pro.';
    return;
  }
  const mobilePhone = String(form.elements.mobilePhone?.value ?? '').trim();
  if (!mobilePhone) {
    whatsappPreview.textContent = 'Isi nomor mobile untuk menyiapkan CTA WhatsApp.';
  } else {
    whatsappPreview.textContent = `Tombol WhatsApp publik akan memakai nomor mobile ${mobilePhone} setelah data disimpan.`;
  }
}
