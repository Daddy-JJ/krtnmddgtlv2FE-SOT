import { paymentService } from '../../services/payment-service.js';
import { cardService } from '../../services/card-service.js';
import { authService } from '../../services/auth-service.js';
import { createPaymentFlow } from '../../services/payment-flow.js';
import { paymentIntents, paymentSessionVersion } from '../../utils/payment-intent.js';
import { billingStatusLabel, paymentEnvironmentLabel, paymentRedirectUrl, paymentErrorMessage, paymentCheckoutAllowed } from '../../validators/payment-validator.js';
import { clearStatus, showStatus } from '../../components/forms/form-utils.js';
import { safeMembershipIntent } from '../../utils/auth-flow.js';

const main = document.querySelector('main#main');
const status = main?.querySelector('[data-form-status]');
const subscription = main?.querySelector('[data-subscription-summary]');
const historyList = main?.querySelector('[data-payment-history]');
const upgradeCards = main?.querySelectorAll('[data-upgrade-card]') ?? [];
const upgradeNote = main?.querySelector('[data-upgrade-note]');
const proUpgradePrice = main?.querySelector('[data-pro-upgrade-price]');
const proUpgradePath = main?.querySelector('[data-pro-upgrade-path]');
const notifyForm = main?.querySelector('[data-notify-form]');
const notifyStatus = main?.querySelector('[data-notify-status]');
const resultPage = Boolean(main?.hasAttribute('data-payment-result'));
const returnOrder = globalThis.__KND_PAYMENT_RETURN__;
delete globalThis.__KND_PAYMENT_RETURN__;
const requestedIntent = safeMembershipIntent(new URLSearchParams(location.search).get('intent'));
const state = { payments: [], subscription: null, cards: [], capabilities: null };
const unavailablePayments = new Set();
let flow;
let flowUserPublicId;
let loading = false;
let submitting = false;
let disposed = false;
let timer;
const active = () => !disposed && main?.isConnected;
const listeners = new AbortController();

historyList?.addEventListener('click', reconcile, { signal: listeners.signal });
main?.addEventListener('click', requestCheckout, { signal: listeners.signal });
main?.querySelector('[data-billing-retry]')?.addEventListener('click', () => void load(), { signal: listeners.signal });
notifyForm?.addEventListener('submit', openNotifyEmail, { signal: listeners.signal });
document.addEventListener('app:page-leave', dispose, { once: true, signal: listeners.signal });
addEventListener('pagehide', dispose, { once: true, signal: listeners.signal });
addEventListener('payment:session-changed', invalidateSession, { signal: listeners.signal });
void load();

function dispose() { disposed = true; clearInterval(timer); listeners.abort(); }
function invalidateSession() {
  clearInterval(timer); timer = undefined;
  flow = undefined;
  flowUserPublicId = undefined;
  Object.assign(state, { payments: [], subscription: null, cards: [], capabilities: null });
  unavailablePayments.clear();
  if (active()) {
    render(); showStatus(status, 'Sesi akun berubah. Muat ulang billing untuk memeriksa akun saat ini.', 'info');
    const retry = main.querySelector('[data-billing-retry]');
    if (retry) retry.hidden = false;
  }
}
const currentSession = version => active() && version === paymentSessionVersion();
function node(tag, text, className = '') {
  const element = document.createElement(tag);
  element.textContent = text;
  element.className = className;
  return element;
}
function errorState(error) {
  if (!active()) return;
  if (error?.status === 401 && error?.code === 'AUTH_REQUIRED') {
    location.assign('/login/?returnTo=%2Fapp%2Fbilling%2F');
    return;
  }
  if (['PAYMENT_CHECKOUT_DISABLED', 'PAYMENT_SANDBOX_FORBIDDEN', 'PAYMENT_GATEWAY_UNAVAILABLE'].includes(error?.code)) state.capabilities = null;
  showStatus(status, paymentErrorMessage(error), 'error');
  renderUpgradeOptions();
}
async function load() {
  if (loading || !active()) return;
  loading = true;
  const version = paymentSessionVersion();
  state.capabilities = null;
  renderUpgradeOptions();
  historyList?.setAttribute('aria-busy', 'true');
  showStatus(status, 'Memuat billing...', 'info');
  try {
    const account = await authService.current();
    const userPublicId = account?.user?.publicId;
    if (!userPublicId) throw { code: 'AUTH_REQUIRED', status: 401 };
    if (!currentSession(version)) return;
    if (flowUserPublicId && flowUserPublicId !== userPublicId) invalidateSession();
    const [sub, payments, cards, capabilities] = await Promise.all([
      paymentService.currentSubscription().catch(error => error.status === 404 ? null : Promise.reject(error)),
      paymentService.listPayments(), cardService.list(),
      paymentService.capabilities().catch(() => null),
    ]);
    if (!currentSession(version)) return;
    if (!Array.isArray(payments) || !Array.isArray(cards)) throw { code: 'PAYMENT_RESPONSE_INVALID' };
    Object.assign(state, { subscription: sub, payments, cards, capabilities });
    if (!flow) flow = createPaymentFlow({ service: paymentService, intents: paymentIntents, userPublicId,
      currentUser: async () => (await authService.current())?.user?.publicId,
      cards: () => cardService.list(), cooldownSeconds: capabilities?.reconcileCooldownSeconds ?? 30 });
    flowUserPublicId = userPublicId;
    flow.setCooldown(capabilities?.reconcileCooldownSeconds ?? 30);
    let resultMessage = '';
    let resultError;
    if (resultPage) {
      try {
        const payment = await flow.resolveReturn(returnOrder);
        if (payment) {
          state.payments = [payment];
          if (payment.status === 'paid') {
            const [freshSubscription, freshCards] = await Promise.all([paymentService.currentSubscription(), cardService.list()]);
            if (!currentSession(version)) return;
            [state.subscription, state.cards] = [freshSubscription, freshCards];
          }
          resultMessage = payment.status === 'pending'
            ? 'Pembayaran sedang diverifikasi. Jangan membuat pembayaran baru.'
            : 'Status transaksi telah diperiksa. Paket mengikuti langganan akun Anda saat ini.';
        } else resultMessage = 'Transaksi belum dapat dicocokkan. Periksa riwayat pembayaran akun Anda di bawah.';
      } catch (error) { resultError = error; }
    }
    if (!currentSession(version)) return;
    render();
    if (!timer) timer = setInterval(() => { updateActions(); renderUpgradeOptions(); }, 1000);
    const retry = main.querySelector('[data-billing-retry]');
    if (retry) retry.hidden = true;
    if (resultError) errorState(resultError);
    else if (resultMessage) showStatus(status, resultMessage, 'info');
    else if (requestedIntent) showStatus(status, 'Peningkatan membership masih Under development.', 'info');
    else clearStatus(status);
  } catch (error) {
    if (!currentSession(version)) return;
    errorState(error);
    if (active()) {
      const retry = main.querySelector('[data-billing-retry]');
      if (retry) retry.hidden = false;
    }
  }
  finally {
    loading = false;
    if (active()) {
      historyList?.removeAttribute('aria-busy');
      renderUpgradeOptions(); updateActions();
    }
  }
}
async function reconcile(event) {
  const button = event.target.closest('[data-reconcile-payment]');
  if (!button || button.disabled || submitting || loading || !flow) return;
  submitting = true;
  const version = paymentSessionVersion();
  updateActions();
  showStatus(status, 'Memeriksa status pembayaran...', 'info');
  try {
    const payment = await flow.reconcile(button.dataset.reconcilePayment);
    if (payment && currentSession(version)) await load();
  } catch (error) {
    if (!currentSession(version)) return;
    if (error?.status === 410) unavailablePayments.add(button.dataset.reconcilePayment);
    errorState(error);
  } finally { submitting = false; if (active()) updateActions(); }
}
async function requestCheckout(event) {
  const button = event.target.closest('[data-checkout-plan]');
  if (!button || button.disabled || submitting || loading || !flow
    || !paymentCheckoutAllowed(state.capabilities)) return;
  submitting = true;
  const version = paymentSessionVersion();
  renderUpgradeOptions();
  showStatus(status, 'Menyiapkan pembayaran...', 'info');
  try {
    const payment = await flow.purchase(button.dataset.checkoutPlan);
    if (!payment || !currentSession(version)) return;
    const url = paymentRedirectUrl(payment);
    if (paymentCheckoutAllowed(state.capabilities) && payment.environment === state.capabilities.environment
      && payment.provider === 'duitku' && payment.status === 'pending' && url) location.assign(url);
    else if (payment.redirectUrl && payment.status === 'pending') {
      await load(); if (currentSession(version)) errorState({ code: 'PAYMENT_RESPONSE_INVALID' });
    }
    else {
      await load();
      if (currentSession(version)) showStatus(status, payment.status === 'pending'
        ? 'Pembayaran sedang diverifikasi. Jangan membuat pembayaran baru.' : 'Status transaksi telah diperiksa.', 'info');
    }
  } catch (error) { if (currentSession(version)) errorState(error); }
  finally { submitting = false; if (active()) renderUpgradeOptions(); }
}
function render() { renderSubscription(); renderUpgradeOptions(); renderHistory(); }
function renderSubscription() {
  if (!subscription) return;
  subscription.replaceChildren(
    node('p', state.subscription?.planCode ? state.subscription.planCode.toUpperCase() : 'Starter / tidak ada paket berbayar aktif', 'text-2xl font-black'),
    node('p', state.subscription?.endsAt ? `Langganan tahunan 365 hari · aktif sampai ${formatDate(state.subscription.endsAt)}`
      : 'Fitur membership mengikuti langganan aktif yang telah dikonfirmasi.', 'mt-2 text-sm text-slate-600'));
}
function renderUpgradeOptions() {
  const currentPlan = state.subscription?.planCode ?? 'starter';
  const enabled = paymentCheckoutAllowed(state.capabilities) && Boolean(flow);
  const wait = flow?.remaining('checkout') || 0;
  upgradeCards.forEach(card => {
    card.hidden = currentPlan === 'pro' || (currentPlan === 'basic' && card.dataset.upgradeCard === 'basic');
    card.querySelectorAll('button').forEach(button => {
      button.disabled = !enabled || submitting || loading || wait > 0;
      button.setAttribute('aria-disabled', String(button.disabled));
      button.textContent = submitting ? 'Memproses permintaan...' : enabled && wait ? `Coba lagi dalam ${wait} detik` : enabled ? 'Uji pembayaran — Sandbox' : 'Under development';
    });
  });
  if (proUpgradePrice) proUpgradePrice.textContent = currentPlan === 'basic' ? 'Rp55.000' : 'Rp97.000';
  if (proUpgradePath) proUpgradePath.textContent = currentPlan === 'basic' ? 'Basic ke Pro' : 'Starter ke Pro';
  if (upgradeNote) upgradeNote.textContent = enabled ? 'Harga akhir dan kelayakan diperiksa saat pembayaran.' : 'Under development — Pembayaran online belum tersedia.';
  if (upgradeNote && state.capabilities?.environment === 'sandbox') upgradeNote.textContent +=
    ' Pembayaran uji — Sandbox. Hanya akun pengujian yang disetujui. Pembayaran uji yang dikonfirmasi dapat mengubah paket dan kartu akun dummy pada database yang sama, bukan manfaat yang terisolasi.';
}
function openNotifyEmail(event) {
  event.preventDefault();
  if (!notifyForm.checkValidity()) { notifyForm.reportValidity(); return; }
  const form = new FormData(notifyForm);
  const plan = form.get('plan');
  const email = String(form.get('email') || '').trim();
  const subject = `Minat membership ${plan} — KartuNamaDigital.id`;
  const body = `Halo tim KartuNamaDigital.id,\n\nSaya tertarik dengan paket ${plan}. Mohon kabari saya saat membership sudah dibuka.\n\nEmail saya: ${email}\n\nTerima kasih.`;
  notifyStatus.textContent = 'Membuka draft email…';
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function renderHistory() {
  if (!historyList) return;
  historyList.replaceChildren();
  if (!state.payments.length) {
    historyList.append(node('p', 'Belum ada riwayat pembayaran.', 'dashboard-panel p-4'));
    return;
  }
  for (const payment of state.payments) {
    const row = node('article', '', 'dashboard-panel p-4');
    row.append(node('h3', `${payment.planName ?? payment.targetPlanCode?.toUpperCase() ?? 'Pembayaran'} · ${billingStatusLabel(payment.status)}`, 'font-bold'));
    row.append(node('p', `${formatMoney(payment.amount, payment.currency)} · ${payment.durationDays ?? 365} hari · ${formatDate(payment.createdAt)}`, 'mt-1 text-sm'));
    const historicalProvider = typeof payment.provider === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(payment.provider) ? payment.provider : '';
    row.append(node('p', payment.provider === 'duitku' ? 'Duitku'
      : `Provider pembayaran tidak didukung.${historicalProvider ? ` Provider historis: ${historicalProvider}.` : ''}`, 'mt-1 text-sm'));
    row.append(node('p', paymentEnvironmentLabel(payment.environment), 'mt-1 text-sm'));
    if (payment.expiresAt) row.append(node('p', `Batas waktu invoice: ${formatDate(payment.expiresAt)}. Status diperiksa melalui server.`, 'mt-1 text-sm'));
    const actions = node('div', '', 'mt-3 flex flex-wrap gap-2');
    const redirectUrl = paymentRedirectUrl(payment);
    if (paymentCheckoutAllowed(state.capabilities) && payment.environment === state.capabilities.environment && redirectUrl) {
      const pay = node('a', 'Lanjut bayar', 'fdn-button--primary');
      pay.href = redirectUrl;
      pay.referrerPolicy = 'no-referrer';
      actions.append(pay);
    }
    if (payment.status === 'pending') {
      row.append(node('p', payment.provider !== 'duitku' ? 'Transaksi ini tidak dapat diproses. Hubungi bantuan.'
        : payment.redirectUrl && !redirectUrl ? 'Tautan pembayaran tidak dapat diverifikasi. Hubungi bantuan.'
          : 'Pembayaran sedang diverifikasi. Jangan membuat pembayaran baru.', 'mt-2 text-sm'));
    }
    const refresh = node('button', 'Perbarui status', 'fdn-button--secondary');
    refresh.type = 'button'; refresh.dataset.reconcilePayment = payment.publicId;
    refresh.dataset.unsupportedProvider = String(payment.provider !== 'duitku');
    actions.append(refresh); row.append(actions); historyList.append(row);
  }
  updateActions();
}
function updateActions() {
  if (!active()) return;
  historyList?.querySelectorAll('[data-reconcile-payment]').forEach(button => {
    const id = button.dataset.reconcilePayment;
    const wait = flow?.remaining(id) || 0;
    button.disabled = submitting || loading || !flow || wait > 0 || button.dataset.unsupportedProvider === 'true' || unavailablePayments.has(id);
    // No aria-live on countdown: announce only action results.
    button.textContent = wait ? `Periksa lagi dalam ${wait} detik` : 'Perbarui status';
  });
}
function formatMoney(amount, currency = 'IDR') {
  if (!['IDR', 'USD'].includes(currency)) currency = 'IDR';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(Number.isFinite(Number(amount)) ? Number(amount) : 0);
}
function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
