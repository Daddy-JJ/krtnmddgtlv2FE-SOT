export function validatePlanCode(value) {
  return value === 'basic' || value === 'pro' ? '' : 'Pilih paket Basic atau Pro.';
}

export function billingStatusLabel(status) {
  return ({
    pending: 'Menunggu',
    paid: 'Berhasil',
    failed: 'Gagal',
    expired: 'Kedaluwarsa',
    canceled: 'Dibatalkan',
    refunded: 'Dikembalikan',
  })[status] ?? 'Tidak diketahui';
}
