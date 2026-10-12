import { cardService } from '../../services/card-service.js';
import { contentService } from '../../services/content-service.js';
import { buildCatalogInput, buildSocialInput, validateCatalogInput, validateSocialInput } from '../../validators/content-validator.js';
import { clearFieldErrors, clearStatus, formValues, mapApiFieldErrors, setBusy, showFieldErrors, showStatus } from '../../components/forms/form-utils.js';
import { ApiError } from '../../services/api-error.js';
import { apiErrorMessage } from '../../utils/api-error-message.js';

const mode = document.querySelector('[data-content-page]')?.dataset.contentPage ?? 'social';
const form = document.querySelector('[data-content-form]');
const list = document.querySelector('[data-content-list]');
const status = document.querySelector('[data-form-status]');
const count = document.querySelector('[data-content-count]');
const state = { card: null, items: [], ready: false, loading: false, inFlight: false, needsReload: false, loginRequired: false, cooldownUntil: 0 };
const lifecycle = new AbortController();
let disposed = false;
let cooldownTimer;
let reloadButton;
let loginLink;

init();

function init() {
  if (!form) return;
  reloadButton = document.createElement('button');
  reloadButton.type = 'button';
  reloadButton.dataset.contentReload = '';
  reloadButton.className = 'mt-3 fdn-button--secondary';
  reloadButton.textContent = 'Periksa daftar';
  reloadButton.hidden = true;
  loginLink = document.createElement('a');
  loginLink.href = '/login/';
  loginLink.className = 'mt-3 fdn-button--secondary';
  loginLink.textContent = 'Login kembali';
  loginLink.hidden = true;
  status?.after(reloadButton, loginLink);
  load();
  form.addEventListener('submit', createItem, { signal: lifecycle.signal });
  list?.addEventListener('click', deleteItem, { signal: lifecycle.signal });
  reloadButton.addEventListener('click', () => {
    if (!state.loading && !state.inFlight && Date.now() >= state.cooldownUntil && !state.loginRequired) load();
  }, { signal: lifecycle.signal });
  document.addEventListener('app:page-leave', dispose, { once: true, signal: lifecycle.signal });
  document.addEventListener('payment:session-changed', () => {
    dispose();
    form.reset();
    list?.replaceChildren();
    if (count) count.textContent = '0 item';
    setCreateLocked(true);
    showStatus(status, 'Sesi akun berubah. Muat ulang halaman sebelum melanjutkan.', 'error');
  }, { signal: lifecycle.signal });
  addEventListener('pagehide', (event) => {
    dispose();
    if (event.persisted) addEventListener('pageshow', () => location.reload(), { once: true });
  }, { once: true, signal: lifecycle.signal });
}

async function load() {
  if (!form || disposed || state.loading || state.inFlight) return;
  state.loading = true;
  state.ready = false;
  updateControls();
  showStatus(status, 'Memuat data...', 'info');
  try {
    const cards = await cardService.list();
    if (disposed) return;
    if (!Array.isArray(cards)) throw new ApiError({ code: 'CONTENT_RESPONSE_INVALID' });
    const first = Array.isArray(cards) ? cards[0] : null;
    if (!first) {
      state.card = null;
      state.items = [];
      renderList();
      showStatus(status, 'Belum ada kartu aktif.', 'error');
      return;
    }
    const card = await cardService.get(first.publicId);
    if (disposed) return;
    state.card = card;
    if (!state.card?.publicId) throw new ApiError({ code: 'CONTENT_RESPONSE_INVALID' });
    await refreshList();
    if (disposed) return;
    state.ready = true;
    state.needsReload = false;
    if (isStarterPlan()) showStatus(status, starterUnavailableMessage(), 'info');
    else clearStatus(status);
  } catch (error) {
    if (disposed) return;
    state.needsReload = true;
    handleError(error);
    showStatus(status, contentErrorMessage(error, 'Daftar belum dapat dimuat. Periksa kembali tanpa mengirim ulang item.'), 'error');
  } finally {
    state.loading = false;
    if (!disposed) updateControls();
  }
}

async function refreshList() {
  const items = mode === 'social'
    ? await contentService.listSocial(state.card.publicId, { signal: lifecycle.signal })
    : await contentService.listCatalog(state.card.publicId, { signal: lifecycle.signal });
  if (disposed) return;
  if (!Array.isArray(items)) throw new ApiError({ code: 'CONTENT_RESPONSE_INVALID' });
  state.items = [...items].sort(compareItems);
  renderList();
}

async function createItem(event) {
  event.preventDefault();
  if (!mutationAllowed() || isStarterPlan()) return;
  const values = { ...formValues(form), sortOrder: nextSortOrder() };
  const input = mode === 'social' ? buildSocialInput(values) : buildCatalogInput(values);
  const errors = mode === 'social' ? validateSocialInput(input) : validateCatalogInput(input);
  if (Object.keys(errors).length) {
    showFieldErrors(form, errors);
    return;
  }
  clearFieldErrors(form);
  state.inFlight = true;
  updateControls();
  showStatus(status, 'Menyimpan...', 'info');
  let saved = false;
  try {
    if (mode === 'social') await contentService.createSocial(state.card.publicId, input, { signal: lifecycle.signal });
    else await contentService.createCatalog(state.card.publicId, input, { signal: lifecycle.signal });
    saved = true;
    if (disposed) return;
    form.reset();
    await refreshList();
    if (disposed) return;
    showStatus(status, mode === 'social' ? 'Tautan sosial ditambahkan.' : 'Item katalog ditambahkan.', 'success');
  } catch (error) {
    if (disposed) return;
    if (saved) {
      state.needsReload = true;
      handleError(error);
      showStatus(status, 'Item sudah tersimpan, tetapi daftar belum dapat diperbarui. Periksa daftar; jangan tambahkan item yang sama lagi.', 'info');
    } else {
      handleError(error);
      if (isAmbiguous(error)) state.needsReload = true;
      const fields = new Set([...form.querySelectorAll('[data-field-error]')].map(node => node.dataset.fieldError));
      const details = Array.isArray(error?.details) ? error.details.filter(item => item && fields.has(item.field) && typeof item.message === 'string') : [];
      showFieldErrors(form, mapApiFieldErrors(details));
      showStatus(status, contentErrorMessage(error), 'error');
    }
  } finally {
    state.inFlight = false;
    if (!disposed) updateControls();
  }
}

async function deleteItem(event) {
  const button = event.target.closest('[data-delete-id]');
  if (!button || button.disabled || !mutationAllowed()) return;
  const itemLabel = mode === 'social' ? 'tautan media sosial' : 'item katalog';
  if (!window.confirm(`Hapus ${itemLabel} ini? Tindakan ini tidak dapat dibatalkan.`)) return;
  state.inFlight = true;
  updateControls();
  let deleted = false;
  try {
    if (mode === 'social') await contentService.deleteSocial(state.card.publicId, button.dataset.deleteId, { signal: lifecycle.signal });
    else await contentService.deleteCatalog(state.card.publicId, button.dataset.deleteId, { signal: lifecycle.signal });
    deleted = true;
    if (disposed) return;
    await refreshList();
    if (disposed) return;
    showStatus(status, 'Item dihapus.', 'success');
  } catch (error) {
    if (disposed) return;
    handleError(error);
    if (deleted || isAmbiguous(error)) state.needsReload = true;
    showStatus(status, deleted ? 'Item sudah dihapus, tetapi daftar belum dapat diperbarui. Periksa daftar tanpa mengulang penghapusan.' : contentErrorMessage(error), deleted ? 'info' : 'error');
  } finally {
    state.inFlight = false;
    if (!disposed) updateControls();
  }
}

function contentErrorMessage(error, fallback = 'Perubahan belum dapat disimpan. Periksa data atau coba lagi nanti.') {
  if (error?.code === 'PLAN_LIMIT_REACHED') {
    if (isStarterPlan()) return starterUnavailableMessage();
    return apiErrorMessage(error, mode === 'social'
      ? 'Batas tautan sosial untuk paket Anda telah tercapai.'
      : 'Batas item katalog untuk paket Anda telah tercapai.');
  }
  if (isAmbiguous(error)) return apiErrorMessage({ requestId: error?.requestId }, 'Status perubahan belum dapat dipastikan. Periksa daftar sebelum mencoba lagi; permintaan tidak dikirim ulang otomatis.');
  if (error?.status === 422) return apiErrorMessage(error, 'Data tidak valid. Periksa isian sebelum mencoba kembali.');
  if (error?.status === 401) return apiErrorMessage(error, 'Sesi tidak dapat digunakan. Salin isian yang diperlukan, lalu login kembali.');
  if (error?.status === 403) return apiErrorMessage(error, 'Anda tidak memiliki akses untuk perubahan ini.');
  if (error?.status === 409) return apiErrorMessage(error, 'Perubahan bertentangan dengan data terbaru. Periksa daftar terlebih dahulu.');
  if (error?.status === 429) return `${apiErrorMessage(error)} Coba secara manual setelah ${Math.ceil(Math.max(0, state.cooldownUntil - Date.now()) / 1000)} detik.`;
  return apiErrorMessage(error, fallback);
}

function isAmbiguous(error) {
  return ['REQUEST_TIMEOUT', 'NETWORK_ERROR'].includes(error?.code) || error?.status >= 500;
}

function handleError(error) {
  if (error?.status === 401 || error?.code === 'RECENT_AUTH_REQUIRED') state.loginRequired = true;
  if (error?.status === 429) {
    const seconds = Number.isSafeInteger(error.retryAfterSeconds) ? Math.max(1, error.retryAfterSeconds) : 30;
    const deadline = Date.now() + seconds * 1000;
    state.cooldownUntil = Number.isSafeInteger(deadline) ? deadline : Date.now() + 30000;
    clearTimeout(cooldownTimer);
    const expire = () => {
      if (disposed) return;
      if (Date.now() < state.cooldownUntil) cooldownTimer = setTimeout(expire, Math.min(state.cooldownUntil - Date.now(), 2147483647));
      else updateControls(); // Never submit/retry when the cooldown expires.
    };
    cooldownTimer = setTimeout(expire, Math.min(state.cooldownUntil - Date.now(), 2147483647));
  }
}

function mutationAllowed() {
  return !disposed && state.ready && state.card && !state.loading && !state.inFlight && !state.needsReload && !state.loginRequired && Date.now() >= state.cooldownUntil;
}

function updateControls() {
  const busy = state.loading || state.inFlight;
  setBusy(form, busy);
  if (!state.ready || !state.card || isStarterPlan() || state.loginRequired) setCreateLocked(true);
  else if (!busy) setCreateLocked(false);
  form.querySelectorAll('button').forEach(button => {
    if (button.type === 'submit') button.disabled = !mutationAllowed() || isStarterPlan();
  });
  list?.querySelectorAll('[data-delete-id]').forEach(button => { button.disabled = !mutationAllowed(); });
  if (reloadButton) {
    reloadButton.hidden = !state.needsReload;
    reloadButton.disabled = busy || state.loginRequired || Date.now() < state.cooldownUntil;
  }
  if (loginLink) loginLink.hidden = !state.loginRequired;
}

function dispose() {
  disposed = true;
  lifecycle.abort();
  clearTimeout(cooldownTimer);
  state.card = null;
  state.items = [];
}

function isStarterPlan() {
  return String(state.card?.planCode ?? '').toLowerCase() === 'starter';
}

function starterUnavailableMessage() {
  return mode === 'social'
    ? 'Tautan sosial tidak tersedia pada paket Starter. Periksa pilihan upgrade Basic atau Pro di menu Langganan.'
    : 'Katalog tidak tersedia pada paket Starter. Periksa pilihan upgrade Basic atau Pro di menu Langganan.';
}

function setCreateLocked(locked) {
  form.querySelectorAll('button,input,textarea,select').forEach((element) => {
    element.disabled = locked;
  });
  if (locked) form.setAttribute('aria-disabled', 'true');
  else form.removeAttribute('aria-disabled');
}

function renderList() {
  list.replaceChildren();
  if (count) count.textContent = `${state.items.length} item`;
  if (!state.items.length) {
    const empty = document.createElement('p');
    empty.className = 'rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600';
    empty.textContent = 'Belum ada item.';
    list.append(empty);
    return;
  }
  state.items.forEach((item, index) => {
    const row = document.createElement('article');
    row.className = 'rounded-lg border border-slate-200 bg-white p-4';
    const position = document.createElement('p');
    position.className = 'text-xs font-semibold uppercase tracking-wider text-slate-500';
    position.textContent = `Posisi ${index + 1}`;
    const title = document.createElement('h2');
    title.className = 'mt-1 font-bold';
    title.textContent = mode === 'social' ? platformLabel(item.platform) : item.title;
    const meta = document.createElement('p');
    meta.className = 'mt-1 break-all text-sm text-slate-600';
    meta.textContent = mode === 'social' ? item.url : item.targetUrl || item.description || '-';
    const visibility = document.createElement('p');
    visibility.className = 'mt-2 text-xs text-slate-500';
    visibility.textContent = mode === 'catalog'
      ? (item.isPublished ? 'Tampil pada kartu publik' : 'Disimpan, belum dipublikasikan')
      : 'Tampil pada kartu publik sesuai akses paket';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'mt-3 min-h-11 rounded-lg border border-red-200 bg-white px-4 py-2.5 font-semibold text-red-700';
    remove.dataset.deleteId = String(mode === 'social' ? item.id : item.publicId);
    remove.textContent = 'Hapus';
    row.append(position, title, meta, visibility, remove);
    list.append(row);
  });
}

function nextSortOrder() {
  const highest = state.items.reduce((value, item) => Math.max(value, Number(item.sortOrder) || 0), -10);
  return Math.min(highest + 10, 100000);
}

function compareItems(left, right) {
  const order = (Number(left.sortOrder) || 0) - (Number(right.sortOrder) || 0);
  if (order) return order;
  return String(left.id ?? left.publicId ?? '').localeCompare(String(right.id ?? right.publicId ?? ''));
}

function platformLabel(platform) {
  return ({
    instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', youtube: 'YouTube',
    tiktok: 'TikTok', x: 'X', other: 'Lainnya',
  })[platform] ?? 'Tautan sosial';
}
