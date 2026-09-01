export const MAX_RESUME_DOCX_BYTES = 10 * 1024 * 1024;

export function validateResumeSourceDocx(file) {
  if (!file || typeof file.name !== 'string' || !Number.isFinite(file.size) || file.size <= 0) {
    return 'Pilih file CV .docx terlebih dahulu.';
  }
  if (!file.name.toLowerCase().endsWith('.docx')) {
    return 'CV sumber wajib menggunakan format .docx.';
  }
  if (file.size > MAX_RESUME_DOCX_BYTES) {
    return 'Ukuran file melebihi batas maksimum 10 MB.';
  }
  return '';
}
