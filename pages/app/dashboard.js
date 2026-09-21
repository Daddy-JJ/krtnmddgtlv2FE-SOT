import { dashboardService } from '../../services/dashboard-service.js';
import { safeHttpUrl } from '../../utils/safe-url.js';

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

init();

function init() {
  load();
}

async function load() {
  renderLoading();
  try {
    const overview = await dashboardService.loadOverview();
    state.cards = overview.cards;
    state.subscription = overview.subscription;
    state.error = null;
  } catch (error) {
    if (error.status === 401) {
      document.dispatchEvent(new CustomEvent('auth:expired'));
      location.assign('/login/');
      return;
    }
    state.error = error;
  } finally {
    state.loading = false;
    render();
  }
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
