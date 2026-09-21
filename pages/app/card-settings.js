import { cardService } from '../../services/card-service.js';
import { canEditSlug, normalizeSlug, validateSlug } from '../../validators/slug-validator.js';
import { clearFieldErrors, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';
import { safeHttpUrl, safeImageUrl } from '../../utils/safe-url.js';

const form = document.querySelector('[data-card-settings-form]');
const status = document.querySelector('[data-form-status]');
const nodes = {
  slug: form?.elements.slug,
  slugError: document.querySelector('[data-field-error="slug"]'),
  currentUrl: document.querySelector('[data-current-url]'),
  qrImage: document.querySelector('[data-qr-image]'),
  qrDownload: document.querySelector('[data-qr-download]'),
  publicOpen: document.querySelector('[data-public-open]'),
  suggestion: document.querySelector('[data-slug-suggestion]'),
  availability: document.querySelector('[data-slug-availability]'),
  changeWarning: document.querySelector('[data-slug-change-warning]'),
  publish: document.querySelector('[data-publish]'),
  saveSlug: document.querySelector('[data-save-slug]'),
  getSuggestion: document.querySelector('[data-get-suggestion]'),
  checkSlug: document.querySelector('[data-check-slug]'),
};
const state = { card: null, savedSlug: '' };

init();

function init() {
  load();
  nodes.getSuggestion?.addEventListener('click', suggestSlug);
  nodes.checkSlug?.addEventListener('click', checkSlug);
  form?.addEventListener('submit', saveSlug);
  nodes.slug?.addEventListener('input', updateSlugWarning);
  nodes.publish?.addEventListener('click', publish);
}

async function load() {
  if (!form) return;
  setBusy(form, true);
  showStatus(status, 'Memuat settings kartu...', 'info');
  try {
    const cards = await cardService.list();
    const first = Array.isArray(cards) ? cards[0] : null;
    if (!first) {
      showStatus(status, 'Belum ada kartu aktif untuk settings.', 'error');
      return;
    }
    state.card = await cardService.get(first.publicId);
    render();
    showStatus(status, 'Settings siap.', 'success');
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

function render() {
  const card = state.card;
  state.savedSlug = card.slug ?? '';
  nodes.slug.value = card.slug ?? '';
  nodes.slug.readOnly = !canEditSlug(card.planCode);
  nodes.saveSlug.disabled = !canEditSlug(card.planCode);
  nodes.checkSlug.disabled = !canEditSlug(card.planCode);
  nodes.getSuggestion.disabled = !canEditSlug(card.planCode);
  const canonicalUrl = safeHttpUrl(card.canonicalUrl);
  const qrImageUrl = safeImageUrl(card.qrImageUrl);
  setText(nodes.currentUrl, canonicalUrl || '-');
  if (canonicalUrl) {
    nodes.publicOpen.href = canonicalUrl;
    nodes.publicOpen.removeAttribute('aria-disabled');
  } else {
    nodes.publicOpen.removeAttribute('href');
    nodes.publicOpen.setAttribute('aria-disabled', 'true');
  }
  if (qrImageUrl) nodes.qrImage.src = qrImageUrl;
  else nodes.qrImage.removeAttribute('src');
  if (qrImageUrl && /^https?:/i.test(qrImageUrl)) {
    nodes.qrDownload.href = `${qrImageUrl}${qrImageUrl.includes('?') ? '&' : '?'}download=true`;
    nodes.qrDownload.removeAttribute('aria-disabled');
  } else {
    nodes.qrDownload.removeAttribute('href');
    nodes.qrDownload.setAttribute('aria-disabled', 'true');
  }
  setText(nodes.availability, canEditSlug(card.planCode) ? 'Basic/Pro dapat mengubah custom URL.' : 'Starter memakai URL random read-only.');
  updateSlugWarning();
}

function updateSlugWarning() {
  if (!nodes.changeWarning) return;
  const candidate = normalizeSlug(nodes.slug?.value);
  nodes.changeWarning.hidden = !(
    state.card
    && canEditSlug(state.card.planCode)
    && candidate
    && candidate !== state.savedSlug
  );
}

async function suggestSlug() {
  if (!state.card || !canEditSlug(state.card.planCode)) return;
  showStatus(status, 'Mengambil suggestion...', 'info');
  try {
    const result = await cardService.slugSuggestion(state.card.contact ?? {});
    nodes.slug.value = result.suggestion;
    setText(nodes.suggestion, `${result.suggestion} · ${result.privacyWarning}`);
    document.dispatchEvent(new CustomEvent('slug:suggested', { detail: { slug: result.suggestion } }));
  } catch (error) {
    showStatus(status, error.message, 'error');
  }
}

async function checkSlug() {
  const slug = normalizeSlug(nodes.slug?.value);
  const message = validateSlug(slug);
  if (message) {
    showFieldErrors(form, { slug: message });
    return;
  }
  clearFieldErrors(form);
  setText(nodes.availability, 'Mengecek availability...');
  document.dispatchEvent(new CustomEvent('slug:checking', { detail: { slug } }));
  try {
    const result = await cardService.slugAvailability(slug);
    const available = Boolean(result.available);
    setText(nodes.availability, available ? 'Custom URL tersedia.' : 'Custom URL tidak tersedia.');
    document.dispatchEvent(new CustomEvent(available ? 'slug:available' : 'slug:unavailable', { detail: { slug } }));
  } catch (error) {
    setText(nodes.availability, error.message);
  }
}

async function saveSlug(event) {
  event.preventDefault();
  if (!state.card || !canEditSlug(state.card.planCode)) return;
  const slug = normalizeSlug(nodes.slug?.value);
  const message = validateSlug(slug);
  if (message) {
    showFieldErrors(form, { slug: message });
    return;
  }
  clearFieldErrors(form);
  if (slug !== state.savedSlug && !window.confirm('Ubah public URL? Tautan dan QR lama tidak akan lagi mengarah ke kartu ini.')) return;
  setBusy(form, true);
  showStatus(status, 'Menyimpan custom URL...', 'info');
  try {
    state.card = await cardService.updateSlug(state.card.publicId, slug);
    render();
    document.dispatchEvent(new CustomEvent('slug:saved', { detail: { slug: state.card.slug } }));
    showStatus(status, 'Custom URL tersimpan. QR/public URL ikut berubah.', 'success');
  } catch (error) {
    showFieldErrors(form, mapApiFieldErrors(error.details));
    showStatus(status, error.message, 'error');
  } finally {
    setBusy(form, false);
  }
}

async function publish() {
  if (!state.card) return;
  nodes.publish.disabled = true;
  showStatus(status, 'Mempublish kartu...', 'info');
  try {
    state.card = await cardService.publish(state.card.publicId);
    render();
    showStatus(status, 'Kartu sudah published.', 'success');
  } catch (error) {
    showStatus(status, error.message, 'error');
  } finally {
    nodes.publish.disabled = false;
  }
}

function setText(node, value) {
  if (node) node.textContent = value;
}
