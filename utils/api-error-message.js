const messages = {
  AUTH_REQUIRED: 'Sesi Anda berakhir. Silakan login kembali.',
  INVALID_CREDENTIALS: 'Password saat ini salah.',
  RECENT_AUTH_REQUIRED: 'Untuk keamanan, silakan login ulang sebelum melanjutkan.',
  CSRF_INVALID: 'Sesi keamanan tidak valid. Muat ulang halaman, lalu coba kembali.',
  RATE_LIMITED: 'Terlalu banyak permintaan. Tunggu beberapa saat lalu coba kembali.',
  AUTH_BUSY: 'Layanan autentikasi sedang sibuk. Tunggu beberapa saat lalu coba kembali.',
  RESOURCE_READ_ONLY: 'Data ini hanya dapat dibaca. Gunakan aksi operasional yang tersedia.',
  RESUME_SCANNER_UNAVAILABLE: 'Pemindaian keamanan CV sedang tidak tersedia. Berkas belum diterima; coba lagi nanti.',
  RESUME_SCANNER_BUSY: 'Pemindai keamanan CV sedang sibuk. Berkas belum diterima; coba lagi beberapa saat lagi.',
  RESUME_FILE_UNSAFE: 'Berkas CV ditolak karena tidak lolos pemeriksaan keamanan. Pilih berkas DOCX lain yang aman.',
  REQUEST_TIMEOUT: 'Permintaan terlalu lama. Status belum dapat dipastikan; periksa data sebelum mencoba kembali.',
  NETWORK_ERROR: 'Koneksi ke layanan terputus. Periksa internet Anda lalu coba lagi.',
};

export function apiErrorMessage(error, fallback = 'Permintaan belum dapat diproses.') {
  const message = messages[String(error?.code ?? '')] ?? fallback;
  return error?.requestId ? `${message} Referensi: ${error.requestId}.` : message;
}

export function resumeUploadState(error) {
  return ({
    RESUME_SCANNER_UNAVAILABLE: 'scanner-unavailable',
    RESUME_SCANNER_BUSY: 'scanner-busy',
    RESUME_FILE_UNSAFE: 'file-unsafe',
  })[error?.code] ?? 'pending';
}

export function resumeUploadStateMessage(value) {
  return ({
    pending: 'Permintaan tersimpan. Upload CV belum selesai; pilih kembali file untuk melanjutkan.',
    'scanner-unavailable': messages.RESUME_SCANNER_UNAVAILABLE,
    'scanner-busy': messages.RESUME_SCANNER_BUSY,
    'file-unsafe': messages.RESUME_FILE_UNSAFE,
  })[value] ?? '';
}
