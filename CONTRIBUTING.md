# Contributing

## Before changing files

1. Ikuti read order di `AGENTS.md`.
2. Pastikan scope sesuai `LOCKED-PLAN.md`.
3. Periksa `git status --short` dan jangan menimpa perubahan pengguna.
4. Nyatakan fase, file, dan acceptance criteria.

## Implementation rules

- Pertahankan arsitektur HTML multi-page dan Vanilla JavaScript kecuali ada
  keputusan arsitektur baru.
- Letakkan orchestration halaman di `pages/`, request API di `services/`, shared
  browser logic di `utils/` atau `validators/`, dan UI reusable di `components/`.
- Jangan menyimpan token atau secret di Web Storage maupun repository.
- Gunakan safe DOM APIs untuk data eksternal.
- Endpoint/payload baru wajib dicatat di API consumer contract.
- Public asset baru wajib ditambahkan secara eksplisit ke allowlist build.
- Jangan mengedit `dist/`; dokumentasi aktif hanya berada di `docs/`.

## Validation

Minimal:

```bash
npm run qa
```

`npm run qa` menjalankan build dan seluruh test, termasuk local same-origin stack.
Test terfokus boleh dipakai selama development, tetapi full QA wajib lulus sebelum
handoff. Setiap pengecualian harus dilaporkan secara eksplisit beserta dampaknya;
jangan menyembunyikan kegagalan.

## Commit convention

Gunakan prefix yang menjelaskan tujuan: `feat:`, `fix:`, `docs:`, `refactor:`,
`test:`, atau `chore:`. Satu commit sebaiknya mewakili satu perubahan koheren.

## Review checklist

For shared UI work, use the existing three Foundations CSS layers and semantic
component roles documented in docs/01-FRONTEND-ARCHITECTURE.md. Do not introduce
parallel theme files or duplicate page overrides. Inspect Light/Dark, mobile
and desktop, long content, keyboard focus, disabled/error states and dynamic
panels. Mocked browser checks do not replace real-data UAT. Keep all ten public
card templates excluded unless their redesign is separately approved.

- Scope dan tier tidak berubah diam-diam.
- UI tetap keyboard-accessible dan mobile-first.
- Tidak ada unsafe DOM sink atau credential browser storage.
- Kontrak API, CSRF context, dan error handling konsisten.
- Build hanya mempublikasikan allowlisted runtime files.
- Test relevan dan `git diff --check` lulus.
- Decision Log diperbarui bila keputusan product owner berubah.
