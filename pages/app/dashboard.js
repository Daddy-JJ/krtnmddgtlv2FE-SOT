import { dashboardService } from '../../services/dashboard-service.js';
import { safeHttpUrl } from '../../utils/safe-url.js';
import { starterService } from '../../services/starter-service.js';
import { forgetStarterClaim } from '../../utils/auth-flow.js';

const state = { cards: [], subscription: null, loading: true, error: null };
const claimedStarter = new URLSearchParams(location.search).get('starter') === 'claimed';
const nodes = {
  status: document.querySelector('[data-app-status]'),
  cardName: document.querySelector('[data-card-name]'),
  cardMeta: document.querySelector('[data-card-meta]'),
  cardUrl: document.querySelector('[data-card-url]'),
  cardStatus: document.querySelector('[data-card-status]'),
  subscription: document.querySelector('[data-subscription]'),
  primaryCardAction: document.querySelector('[data-primary-card-action]'),
  starterAction: document.querySelector('[data-starter-action]'),
  navLinks: document.querySelectorAll('[data-app-link]'),
};

const recovery = document.querySelector('[data-starter-recovery]');
const recoveryStatus = recovery?.querySelector('[data-recovery-status]');
const recoveryList = recovery?.querySelector('[data-recovery-list]');
const recoveryState = { items: [], offset: 0, hasMore: false, busy: false, until: 0, blocked: false };
let disposed = false;
let generation = 0;
let recoveryTimer;
const recoveryListeners = new AbortController();
const live = version => !disposed && version === generation && (!recovery || recovery.isConnected);
recovery?.addEventListener('click', recoveryAction, { signal: recoveryListeners.signal });
document.addEventListener('app:page-leave', dispose, { once: true, signal: recoveryListeners.signal });
addEventListener('pagehide', dispose, { once: true, signal: recoveryListeners.signal });
addEventListener('payment:session-changed', () => {
  dispose();
  state.cards = []; state.subscription = null; state.error = null;
  recoveryList?.replaceChildren();
  render(); setText(nodes.status, 'Sesi akun berubah. Muat ulang dashboard untuk memeriksa akun saat ini.');
  if (recovery) recovery.hidden = true;
}, { signal: recoveryListeners.signal });

init();

function init() {
  load();
}

async function load() {
  if (disposed) return;
  const version = generation;
  state.loading = true;
  renderLoading();
  try {
    const overview = await dashboardService.loadOverview();
    if (!live(version)) return;
    state.cards = overview.cards;
    state.subscription = overview.subscription;
    state.error = null;
  } catch (error) {
    if (!live(version)) return;
    if (error.status === 401) {
      dispose();
      document.dispatchEvent(new CustomEvent('auth:expired'));
      location.assign('/login/');
      return;
    }
    state.error = error;
  } finally {
    if (live(version)) { state.loading = false; render(); }
  }
  if (live(version) && !state.error && !state.cards.length) await loadCandidates();
}

function renderLoading() {
  setText(nodes.status, 'Memuat dashboard...');
  nodes.navLinks.forEach((link) => link.setAttribute('aria-disabled', 'true'));
}

function render() {
  if (state.error) {
    setText(nodes.status, state.error.message);
    return;
  }
  const card = state.cards[0] ?? null;
  renderCardActions(card);
  setText(nodes.status, claimedStarter && card
    ? 'Kartu Starter berhasil dihubungkan ke akun Anda.'
    : card ? 'Dashboard siap.' : 'Belum ada kartu aktif di akun ini.');
  setText(nodes.cardName, card?.contact?.fullName || 'Belum ada kartu');
  setText(nodes.cardMeta, card ? `${labelPlan(card.planCode)} · ${labelStatus(card.status)}` : 'Claim kartu Starter atau aktifkan paket Basic/Pro.');
  setText(nodes.cardStatus, card ? labelStatus(card.status) : 'Kosong');
  const publicCardUrl = safePublicCardUrl(card?.canonicalUrl);
  if (publicCardUrl) {
    nodes.cardUrl.href = publicCardUrl;
    setText(nodes.cardUrl, publicCardUrl);
  } else {
    nodes.cardUrl.removeAttribute('href');
    setText(nodes.cardUrl, '-');
  }
  setText(nodes.subscription, formatSubscription(state.subscription, card));
  nodes.navLinks.forEach((link) => link.removeAttribute('aria-disabled'));
}

function safePublicCardUrl(value) {
  const safe = safeHttpUrl(value);
  if (!safe) return '';
  try {
    const url = new URL(safe);
    return url.origin === location.origin ? url.href : '';
  } catch {
    return '';
  }
}

function renderCardActions(card) {
  if (recovery) recovery.hidden = Boolean(card);
  const action = nodes.primaryCardAction;
  if (action) {
    const hasCard = Boolean(card);
    action.href = hasCard ? '/app/card/identity/' : '/create/';
    setText(action, hasCard ? 'Edit kartu nama' : 'Buat Starter');
    action.classList.toggle('primary-cta', !hasCard);
    action.classList.toggle('dashboard-action', hasCard);
    action.classList.toggle('text-white', !hasCard);
    action.classList.toggle('text-slate-900', hasCard);
    action.setAttribute('aria-label', hasCard ? 'Edit kartu nama aktif' : 'Buat kartu Starter');
  }
  // The primary action already handles both empty and owned-card states.
  nodes.starterAction?.setAttribute('hidden', '');
}

function dispose() {
  disposed = true; generation += 1; clearTimeout(recoveryTimer); recoveryListeners.abort();
  recoveryState.items = []; recoveryState.busy = false;
  recoveryList?.replaceChildren();
}

function recoveryControls() {
  if (!recovery) return;
  const waiting = Date.now() < recoveryState.until;
  recovery.querySelectorAll('button').forEach(button => { button.disabled = disposed || state.loading || recoveryState.busy || waiting || recoveryState.blocked; });
  recovery.setAttribute('aria-busy', String(recoveryState.busy));
  recovery.querySelector('[data-recovery-prev]').hidden = recoveryState.offset === 0;
  recovery.querySelector('[data-recovery-next]').hidden = !recoveryState.hasMore || recoveryState.offset >= 1000;
}

async function loadCandidates(offset = recoveryState.offset) {
  if (!recovery || !live(generation) || recoveryState.busy || recoveryState.blocked || Date.now() < recoveryState.until) return;
  const version = generation;
  recoveryState.busy = true; recoveryState.items = []; recoveryList.replaceChildren(); recoveryControls();
  setText(recoveryStatus, 'Mencari kartu Starter Anda...');
  try {
    const data = await starterService.claimCandidates(offset, { signal: recoveryListeners.signal });
    if (!live(version)) return;
    Object.assign(recoveryState, data);
    for (const item of data.items) {
      const row = document.createElement('article'); row.className = 'dashboard-panel p-4';
      const title = document.createElement('h3'); title.className = 'font-bold'; title.textContent = item.displayName || 'Kartu Starter';
      const detail = document.createElement('p'); detail.className = 'mt-2 break-all'; detail.textContent = `${item.slug} · ${formatDate(item.createdAt)}`;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'fdn-button--primary mt-3';
      button.textContent = 'Hubungkan ke akun saya'; button.dataset.claimCandidate = item.publicId;
      row.append(title, detail, button); recoveryList.append(row);
    }
    recovery.querySelector('[data-recovery-verify]').hidden = true;
    setText(recoveryStatus, data.items.length ? 'Kartu yang cocok dengan email akun ditemukan. Pilih hanya kartu yang Anda buat.'
      : 'Tidak ada kandidat kartu pada halaman ini. Jika sudah membuat kartu, buka link Kelola kartu dari email.');
  } catch (error) { if (live(version)) recoveryError(error); }
  finally { if (live(version)) { recoveryState.busy = false; recoveryControls(); } }
}

async function recoveryAction(event) {
  const button = event.target.closest('button');
  if (!button || !recovery.contains(button) || button.disabled || disposed || recoveryState.busy || recoveryState.blocked || Date.now() < recoveryState.until) return;
  const id = button.dataset.claimCandidate;
  if (!id) {
    if (button.hasAttribute('data-recovery-prev')) await loadCandidates(Math.max(0, recoveryState.offset - 20));
    else if (button.hasAttribute('data-recovery-next')) await loadCandidates(Math.min(1000, recoveryState.offset + 20));
    else await loadCandidates();
    return;
  }
  const item = recoveryState.items.find(candidate => candidate.publicId === id);
  if (!item) return;
  // Guard before confirmation and before the first asynchronous operation.
  recoveryState.busy = true; recoveryControls();
  const version = generation;
  try {
    if (!window.confirm(`Hubungkan kartu ${item.displayName || 'Starter'} (${item.slug}) ke akun Anda? Pilih hanya kartu yang Anda buat.`)) return;
    setText(recoveryStatus, 'Menghubungkan kartu ke akun Anda...');
    await starterService.claimCandidate(id, { signal: recoveryListeners.signal });
    if (!live(version)) return;
    forgetStarterClaim();
    await load();
    if (live(version)) {
      recoveryList.replaceChildren(); recoveryState.items = [];
      setText(nodes.status, state.error || !state.cards.some(card => card.publicId === id)
        ? 'Claim diterima, tetapi dashboard belum dapat dikonfirmasi. Muat ulang halaman; jangan membuat kartu baru.'
        : 'Kartu Starter berhasil dihubungkan ke akun Anda.');
    }
  } catch (error) {
    if (!live(version)) return;
    if (error.status === 409 || error.code === 'STARTER_NOT_ELIGIBLE') {
      await load();
      if (!live(version)) return;
      recoveryState.busy = false;
      if (!state.error && !state.cards.length) await loadCandidates(0);
    }
    if (live(version)) recoveryError(error);
  } finally { if (live(version)) { recoveryState.busy = false; recoveryControls(); } }
}

function recoveryError(error) {
  if (error.status === 401 && error.code === 'AUTH_REQUIRED') {
    dispose(); location.assign('/login/?returnTo=%2Fapp%2F'); return;
  }
  const messages = {
    EMAIL_VERIFICATION_REQUIRED: 'Verifikasi email akun sebelum menghubungkan kartu.',
    CSRF_INVALID: 'Sesi keamanan tidak sinkron. Muat ulang halaman sebelum mencoba kembali.',
    STARTER_NOT_ELIGIBLE: 'Kartu tidak lagi tersedia untuk dihubungkan. Periksa daftar terbaru atau hubungi support.',
    STARTER_ALREADY_OWNED: 'Kartu sudah terhubung ke akun lain. Jangan membuat duplikat; hubungi support.',
    PLAN_LIMIT_REACHED: 'Akun sudah memiliki kartu. Dashboard diperiksa ulang; jangan membuat kartu tambahan.',
    VALIDATION_ERROR: 'Permintaan tidak valid. Periksa kembali pilihan kartu.',
    RATE_LIMITED: 'Terlalu banyak permintaan. Tunggu sebelum mencoba secara manual.',
  };
  if (error.code === 'EMAIL_VERIFICATION_REQUIRED') {
    recovery.querySelector('[data-recovery-verify]').hidden = false;
    recoveryState.blocked = true;
  }
  if (error.status === 429) {
    const seconds = Number.isSafeInteger(error.retryAfterSeconds) && error.retryAfterSeconds >= 0 ? Math.max(1, error.retryAfterSeconds) : 30;
    recoveryState.until = Date.now() + seconds * 1000;
    clearTimeout(recoveryTimer);
    recoveryTimer = setTimeout(() => { if (!disposed) recoveryControls(); }, Math.min(seconds * 1000, 2147483647));
  }
  const message = messages[error.code] || (error.status === 404
    ? 'Pemulihan kartu belum tersedia di layanan ini. Gunakan link Kelola kartu dari email atau hubungi support.'
    : 'Status kartu belum dapat dipastikan. Periksa dashboard atau muat ulang sebelum mencoba lagi; jangan membuat kartu baru.');
  setText(recoveryStatus, message);
  setText(nodes.status, message);
}

function formatSubscription(subscription, card) {
  if (subscription?.planCode) return `${labelPlan(subscription.planCode)} aktif sampai ${formatDate(subscription.endsAt)}.`;
  if (card?.planCode === 'starter') return 'Starter aktif tanpa subscription berbayar.';
  return 'Belum ada subscription aktif.';
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
}

function labelPlan(plan) {
  return ({ starter: 'Starter', basic: 'Basic', pro: 'Pro' })[plan] ?? 'Unknown';
}

function labelStatus(status) {
  return ({ draft: 'Draft', published: 'Published', suspended: 'Suspended', deleted: 'Deleted', active: 'Active' })[status] ?? status ?? '-';
}

function setText(node, value) {
  if (node) node.textContent = value;
}
