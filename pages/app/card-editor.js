import { cardService } from '../../services/card-service.js';
import { paymentService } from '../../services/payment-service.js';
import { buildCardInput, validateCardInput } from '../../validators/card-validator.js';
import { clearFieldErrors, formValues, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';
import { mountCardLivePreview } from '../../components/card-live-preview.js';
import { bindWebsiteUrlInput } from '../../utils/website-url.js';
import { splitName } from '../../utils/name-format.js';
import { apiErrorMessage } from '../../utils/api-error-message.js';

const form = document.querySelector('[data-card-editor-form]');
const status = document.querySelector('[data-form-status]');
const previewStage = document.querySelector('[data-card-live-preview]');
const previewStatus = document.querySelector('[data-card-live-preview-status]');
const whatsappPreview = document.querySelector('[data-whatsapp-preview]');
const starterNextStep = document.querySelector('[data-starter-next-step]');
const section = form?.dataset.editorSection ?? 'card';
const editableFields = [
  'namePrefix', 'firstName', 'lastName', 'jobTitle', 'organization',
  'officePhone', 'mobilePhone', 'email', 'websiteUrl',
  'addressStreet', 'addressCity', 'addressProvince', 'addressPostalCode', 'addressCountry',
  'mapsUrl',
];
const state = { card: null, preview: null, mode: 'loading', submitting: false };

init();
bindWebsiteUrlInput(form?.elements.websiteUrl);

function init() {
  load();
  form?.addEventListener('submit', save);
  form?.addEventListener('input', updateLivePreview);
}

async function load() {
  if (!form) return;
  state.mode = 'loading';
  setBusy(form, true);
  showStatus(status, 'Memuat data kartu...', 'info');
  try {
    const cards = await cardService.list();
    if (!Array.isArray(cards) || cards.some(card => !card || typeof card.publicId !== 'string' || !card.publicId.trim())) {
      throw new Error('Respons daftar kartu tidak valid. Muat ulang halaman sebelum menyimpan.');
    }
    const first = cards[0];
    if (!first) {
      const subscription = await paymentService.currentSubscription().catch(error => {
        if (error.status === 404) return null;
        throw error;
      });
      if (subscription !== null && (!subscription || !['basic', 'pro'].includes(subscription.planCode)
        || typeof subscription.status !== 'string' || typeof subscription.startsAt !== 'string' || typeof subscription.endsAt !== 'string'
        || !Number.isFinite(Date.parse(subscription.startsAt))
        || !Number.isFinite(Date.parse(subscription.endsAt)))) {
        throw new Error('Status paket belum dapat diverifikasi. Muat ulang halaman sebelum menyimpan.');
      }
      const now = Date.now();
      if (!subscription || subscription.status !== 'active' || Date.parse(subscription.startsAt) > now || Date.parse(subscription.endsAt) <= now) {
        requireStarter();
        return;
      }
      state.mode = 'empty';
      await loadLivePreview();
      showStatus(status, 'Belum ada kartu di akun ini. Isi form untuk membuat kartu pertama; akses paket tetap ditentukan oleh akun Anda.', 'info');
      return;
    }
    state.card = await cardService.get(first.publicId);
    if (!validCard(state.card) || state.card.publicId !== first.publicId) {
      state.card = null;
      throw new Error('Respons detail kartu tidak valid. Muat ulang halaman sebelum menyimpan.');
    }
    state.mode = 'ready';
    fillForm(state.card);
    await loadLivePreview();
    showStatus(status, 'Data kartu siap diedit.', 'success');
  } catch (error) {
    state.mode = 'load_failed';
    if (error.status === 401) {
      location.assign('/login/');
      return;
    }
    showStatus(status, error.message, 'error');
  } finally {
    setBusy(form, false);
    setEditorLocked(state.mode === 'load_failed');
    if (state.mode === 'starter_required') lockCreation();
  }
}

async function save(event) {
  event.preventDefault();
  if (state.submitting) return;
  if (state.mode === 'starter_required') { requireStarter(); return; }
  if (!['empty', 'ready'].includes(state.mode)) {
    showStatus(status, 'Data kartu belum siap. Muat ulang halaman sebelum menyimpan.', 'error');
    return;
  }
  const values = formValues(form);
  const input = buildCardInput(values, state.card, document.documentElement.lang);
  const errors = validateCardInput(input);
  if (errors.fullName) {
    errors.firstName = errors.fullName;
    delete errors.fullName;
  }
  if (errors.addressText) {
    errors.addressStreet = errors.addressText;
    delete errors.addressText;
  }
  if (!String(values.firstName ?? '').trim()) errors.firstName = 'Nama depan wajib diisi.';
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    showStatus(status, 'Periksa field yang ditandai.', 'error');
    return;
  }
  clearFieldErrors(form);
  state.submitting = true; // Guard before the first async operation, including CSRF synchronization.
  setBusy(form, true);
  showStatus(status, 'Menyimpan perubahan...', 'info');
  const creating = !state.card;
  try {
    const saved = state.card
      ? await cardService.update(state.card.publicId, input)
      : await cardService.create(input);
    if (!validCard(saved) || (!creating && saved.publicId !== state.card.publicId)) {
      throw Object.assign(new Error('Respons penyimpanan tidak valid.'), { code: 'CARD_RESPONSE_INVALID' });
    }
    state.card = saved;
    state.mode = 'ready';
    fillForm(state.card);
    if (state.preview) state.preview.update(previewData());
    else await loadLivePreview();
    document.dispatchEvent(new CustomEvent('card:saved', { detail: { publicId: state.card.publicId, section } }));
    showStatus(status, creating ? 'Kartu berhasil dibuat.' : 'Perubahan tersimpan.', 'success');
  } catch (error) {
    showFieldErrors(form, mapApiFieldErrors(error.details));
    // A first-card POST may have persisted despite a lost/invalid response.
    // Require a new owned-card read before allowing another creation attempt.
    const ambiguous = creating && (['REQUEST_TIMEOUT', 'NETWORK_ERROR', 'CARD_RESPONSE_INVALID'].includes(error.code) || error.status >= 500);
    if (error.code === 'PAID_ENTITLEMENT_REQUIRED') {
      requireStarter();
    } else if (ambiguous) {
      state.mode = 'save_unknown';
      showStatus(status, 'Status penyimpanan belum dapat dipastikan. Salin perubahan form, lalu muat ulang halaman untuk memeriksa kartu sebelum mencoba lagi.', 'error');
    } else showStatus(status, apiErrorMessage(error, 'Perubahan belum dapat disimpan. Periksa data atau muat ulang halaman.'), 'error');
  } finally {
    state.submitting = false;
    setBusy(form, false);
    if (state.mode === 'save_unknown') form.querySelectorAll('button[type="submit"]').forEach(button => { button.disabled = true; });
    if (state.mode === 'starter_required') lockCreation();
  }
}

function lockCreation() {
  form.querySelectorAll('button[type="submit"]').forEach(button => { button.disabled = true; });
}

function requireStarter() {
  state.mode = 'starter_required';
  if (starterNextStep) {
    starterNextStep.hidden = false;
    starterNextStep.querySelector('[data-starter-next-step-message]').textContent =
      'Pembuatan kartu ini memerlukan Basic atau Pro aktif. Anda bisa mulai dengan Starter gratis, kemudian upgrade saat pembayaran tersedia.';
  }
  showStatus(status, 'Mulai dengan Starter gratis melalui tombol di atas. Paket Basic/Pro belum aktif untuk pembuatan kartu ini.', 'info');
  lockCreation();
}

function validCard(card) {
  return card && typeof card.publicId === 'string' && Boolean(card.publicId.trim())
    && card.contact && typeof card.contact === 'object' && !Array.isArray(card.contact);
}

function fillForm(card) {
  const name = String(card.contact?.fullName ?? '').trim().replace(/\s+/g, ' ');
  const nameParts = splitName(name);
  const address = String(card.contact?.addressText ?? '').split(/\r?\n|\|/).map((part) => part.trim());
  const values = {
    namePrefix: nameParts.prefix,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
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

function setEditorLocked(locked) {
  form.querySelectorAll('button,input,textarea,select').forEach((element) => {
    element.disabled = locked;
  });
  if (locked) form.setAttribute('aria-disabled', 'true');
  else form.removeAttribute('aria-disabled');
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
  const mobilePhone = String(form.elements.mobilePhone?.value ?? '').trim();
  if (!mobilePhone) {
    whatsappPreview.textContent = 'CTA WhatsApp tersedia untuk Starter, Basic, dan Pro. Isi nomor mobile untuk menyiapkannya.';
  } else {
    whatsappPreview.textContent = `Tombol WhatsApp publik akan memakai nomor mobile ${mobilePhone} setelah data disimpan.`;
  }
}
