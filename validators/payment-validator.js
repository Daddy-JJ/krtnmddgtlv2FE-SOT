export function validatePlanCode(value) {
  return value === 'basic' || value === 'pro' ? '' : 'Pilih paket Basic atau Pro.';
}

// FE-D-041 approves production source; valid backend capabilities are still required.
export const PAYMENT_CHECKOUT_RELEASED = true;
// Owner-approved restricted sandbox only; account allowlist remains backend-owned.
export const PAYMENT_SANDBOX_RELEASED = true;

export function paymentCheckoutAllowed(capabilities, { released = PAYMENT_CHECKOUT_RELEASED, sandboxReleased = PAYMENT_SANDBOX_RELEASED } = {}) {
  if (!validCapabilities(capabilities) || capabilities.checkoutEnabled !== true) return false;
  return capabilities.environment === 'sandbox' ? sandboxReleased === true : released === true;
}
export const isPaymentId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export function validCapabilities(data) {
  return data?.provider === 'duitku' && ['sandbox', 'production'].includes(data.environment)
    && typeof data.checkoutEnabled === 'boolean' && data.idempotencyKeyRequired === true
    && Number.isInteger(data.reconcileCooldownSeconds) && data.reconcileCooldownSeconds >= 30;
}

// Pending financial evidence blocks replacement orders, including old sandbox invoices.
// This is presentation/flow classification only; the server owns final status/eligibility.
export function pendingPaymentIssue(payment, capabilities, planCode) {
  if (payment?.status !== 'pending') return '';
  if (payment.provider === 'duitku' && payment.environment === 'sandbox' && capabilities?.environment === 'production') return 'PAYMENT_SANDBOX_PENDING';
  if (payment.provider !== 'duitku' || !validCapabilities(capabilities)
    || payment.environment !== capabilities.environment || validatePlanCode(payment.targetPlanCode)) return 'PAYMENT_PENDING_CONTEXT_CONFLICT';
  return planCode && payment.targetPlanCode !== planCode ? 'CHECKOUT_PENDING_EXISTS' : '';
}

export function pendingCheckoutIssue(payments, capabilities, planCode) {
  const pending = payments.filter(payment => payment?.status === 'pending');
  const issue = pending.map(payment => pendingPaymentIssue(payment, capabilities, planCode)).find(Boolean);
  return issue || (pending.length > 1 ? 'PAYMENT_PENDING_CONTEXT_CONFLICT' : '');
}

export function paymentRedirectUrl(payment) {
  if (payment?.provider !== 'duitku' || payment.status !== 'pending' || typeof payment.redirectUrl !== 'string') return '';
  const host = { sandbox: 'app-sandbox.duitku.com', production: 'app-prod.duitku.com' }[payment.environment];
  try {
    const url = new URL(payment.redirectUrl);
    const query = [...url.searchParams];
    if (!host || url.protocol !== 'https:' || url.hostname !== host || url.pathname !== '/redirect_checkout'
      || url.username || url.password || url.port || url.hash || payment.redirectUrl.includes('#') || query.length !== 1
      || query[0][0] !== 'reference' || !query[0][1].trim()) return '';
    return url.href;
  } catch { return ''; }
}

export function billingStatusLabel(status) {
  return ({
    pending: 'Menunggu',
    paid: 'Berhasil',
    failed: 'Gagal',
    expired: 'Kedaluwarsa',
    canceled: 'Dibatalkan',
    refunded: 'Dikembalikan',
    refund_pending_review: 'Pengembalian menunggu peninjauan',
  })[status] ?? 'Tidak diketahui';
}

export function paymentErrorMessage(error) {
  if (error?.status === 410) return 'Transaksi ini tidak dapat diproses lagi. Hubungi bantuan.';
  return ({
    AUTH_REQUIRED: 'Sesi berakhir. Silakan login ulang.',
    CSRF_INVALID: 'Sesi keamanan tidak sinkron. Muat ulang halaman sebelum mencoba kembali.',
    CHECKOUT_NOT_ALLOWED: 'Verifikasi akun dan klaim kartu aktif sebelum melakukan upgrade.',
    VALIDATION_ERROR: 'Periksa pilihan paket dan data permintaan.',
    PAYMENT_NOT_FOUND: 'Transaksi tidak ditemukan atau tidak dapat diakses.',
    IDEMPOTENCY_CONFLICT: 'Permintaan berbeda dari percobaan sebelumnya. Hubungi bantuan.',
    CHECKOUT_PENDING_EXISTS: 'Masih ada transaksi menunggu. Periksa transaksi tersebut.',
    PAYMENT_SANDBOX_PENDING: 'Transaksi uji sebelumnya belum selesai. Perbarui status atau hubungi bantuan sebelum melakukan pembayaran baru.',
    PAYMENT_PENDING_CONTEXT_CONFLICT: 'Transaksi sebelumnya belum selesai atau konteks pembayarannya berbeda. Perbarui status atau hubungi bantuan sebelum melakukan pembayaran baru.',
    RATE_LIMITED: 'Terlalu banyak pemeriksaan. Tunggu sebelum mencoba lagi.',
    PAYMENT_CHECKOUT_DISABLED: 'Pembayaran online belum tersedia.',
    PAYMENT_SANDBOX_FORBIDDEN: 'Pembayaran uji hanya tersedia untuk akun pengujian yang disetujui',
    PAYMENT_GATEWAY_UNAVAILABLE: 'Layanan pembayaran sementara belum tersedia. Periksa riwayat sebelum mencoba kembali.',
    PAYMENT_COORDINATION_UNAVAILABLE: 'Browser belum dapat menyimpan permintaan pembayaran dengan aman. Hubungi bantuan.',
    PAYMENT_RESPONSE_INVALID: 'Respons pembayaran tidak dapat diverifikasi. Periksa riwayat atau hubungi bantuan.',
  })[error?.code] ?? (error?.status === 503
    ? 'Layanan pembayaran sementara belum tersedia. Periksa riwayat sebelum mencoba kembali.'
    : 'Status pembayaran belum dapat dipastikan. Periksa riwayat sebelum mencoba lagi; hubungi bantuan jika berlanjut.');
}

export function paymentEnvironmentLabel(environment) {
  return environment === 'sandbox' ? 'Pembayaran uji — Sandbox'
    : environment === 'production' ? 'Production' : 'Lingkungan tidak diketahui';
}
