import { paymentService } from '../../services/payment-service.js';
import { billingStatusLabel } from '../../validators/payment-validator.js';
import { showStatus } from '../../components/forms/form-utils.js';
import { safeMembershipIntent } from '../../utils/auth-flow.js';

const status = document.querySelector('[data-form-status]');
const subscription = document.querySelector('[data-subscription-summary]');
const history = document.querySelector('[data-payment-history]');
const upgradeCards = document.querySelectorAll('[data-upgrade-card]');
const upgradeNote = document.querySelector('[data-upgrade-note]');
const proUpgradePrice = document.querySelector('[data-pro-upgrade-price]');
const proUpgradePath = document.querySelector('[data-pro-upgrade-path]');
const notifyForm = document.querySelector('[data-notify-form]');
const notifyStatus = document.querySelector('[data-notify-status]');
const state = { payments: [], subscription: null };
const requestedIntent = safeMembershipIntent(new URLSearchParams(location.search).get('intent'));

init();

function init() {
  load();
  history?.addEventListener('click', reconcile);
  notifyForm?.addEventListener('submit', openNotifyEmail);
}

async function load() {
  showStatus(status, 'Memuat billing...', 'info');
  try {
    const [sub, payments] = await Promise.all([
      paymentService.currentSubscription().catch((error) => error.status === 404 ? null : Promise.reject(error)),
      paymentService.listPayments(),
    ]);
    state.subscription = sub;
    state.payments = Array.isArray(payments) ? payments : [];
    render();
    showStatus(status, requestedIntent ? 'Under development' : 'Tagihan siap.', 'success');
  } catch (error) {
    if (error.status === 401) {
      location.assign('/login/');
      return;
    }
    showStatus(status, error.message, 'error');
  }
}

async function reconcile(event) {
  const button = event.target.closest('[data-reconcile-payment]');
  if (!button) return;
  button.disabled = true;
  showStatus(status, 'Memeriksa status pembayaran...', 'info');
  try {
    await paymentService.reconcile(button.dataset.reconcilePayment);
    await load();
  } catch (error) {
    showStatus(status, error.message, 'error');
    button.disabled = false;
  }
}

function render() {
  renderSubscription();
  renderUpgradeOptions();
  renderHistory();
}

function renderSubscription() {
  subscription.replaceChildren();
  const title = document.createElement('p');
  title.className = 'text-2xl font-black';
  title.textContent = state.subscription?.planCode ? state.subscription.planCode.toUpperCase() : 'Starter / tidak ada paket berbayar aktif';
  const meta = document.createElement('p');
  meta.className = 'mt-2 text-sm text-slate-600';
  meta.textContent = state.subscription?.endsAt ? `Langganan tahunan 365 hari · aktif sampai ${formatDate(state.subscription.endsAt)}` : 'Fitur membership akan tersedia setelah pembayaran berhasil dikonfirmasi.';
  subscription.append(title, meta);
}

function renderUpgradeOptions() {
  const currentPlan = state.subscription?.planCode ?? 'starter';
  upgradeCards.forEach((card) => {
    card.hidden = false;
    card.querySelectorAll('button').forEach((button) => { button.disabled = true; });
  });
  if (currentPlan === 'basic') {
    proUpgradePrice.textContent = 'Rp55.000';
    proUpgradePath.textContent = 'Basic ke Pro';
  } else {
    proUpgradePrice.textContent = 'Rp97.000';
    proUpgradePath.textContent = 'Starter ke Pro';
  }
  upgradeNote.textContent = 'Under development';
}

function openNotifyEmail(event) {
  event.preventDefault();
  const form = new FormData(notifyForm);
  const plan = form.get('plan');
  const email = form.get('email');
  const subject = `Minat membership ${plan} — KartuNamaDigital.id`;
  const body = `Halo tim KartuNamaDigital.id,\n\nSaya tertarik dengan paket ${plan}. Mohon kabari saya saat membership sudah dibuka.\n\nEmail saya: ${email}\n\nTerima kasih.`;
  notifyStatus.textContent = 'Membuka draft email…';
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function renderHistory() {
  history.replaceChildren();
  if (!state.payments.length) {
    const empty = document.createElement('p');
    empty.className = 'rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600';
    empty.textContent = 'Belum ada riwayat pembayaran.';
    history.append(empty);
    return;
  }
  for (const payment of state.payments) {
    const row = document.createElement('article');
    row.className = 'rounded-lg border border-slate-200 bg-white p-4';
    const title = document.createElement('h2');
    title.className = 'font-bold';
    title.textContent = `${payment.planName ?? payment.targetPlanCode?.toUpperCase()} · ${billingStatusLabel(payment.status)}`;
    const meta = document.createElement('p');
    meta.className = 'mt-1 text-sm text-slate-600';
    meta.textContent = `${formatMoney(payment.amount, payment.currency)} · ${payment.durationDays??365} hari · ${formatDate(payment.createdAt)}`;
    const actions = document.createElement('div');
    actions.className = 'mt-3 flex flex-wrap gap-2';
    if (payment.redirectUrl && payment.status === 'pending') {
      const pay = document.createElement('a');
      pay.className = 'min-h-11 rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white';
      pay.href = payment.redirectUrl;
      pay.target = '_blank';
      pay.rel = 'noopener noreferrer';
      pay.textContent = 'Lanjut bayar';
      actions.append(pay);
    }
    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.className = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 py-2.5 font-semibold';
    refresh.dataset.reconcilePayment = payment.publicId;
    refresh.textContent = 'Perbarui status';
    actions.append(refresh);
    row.append(title, meta, actions);
    history.append(row);
  }
}

function formatMoney(amount, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(Number(amount ?? 0));
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(date);
}
