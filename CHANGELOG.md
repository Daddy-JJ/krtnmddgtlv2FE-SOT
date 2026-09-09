# Changelog

Perubahan historis monorepo sebelum reintegrasi tersedia di
`docs/_legacy-sot/root/CHANGELOG.md`.

## Unreleased

- Menyederhanakan form Starter dengan sapaan Mr/Mrs/Ms opsional, nama belakang
  opsional, website opsional, dan istilah Nomor handphone.
- Mengarahkan link pengelolaan Starter langsung ke Signup, mengisi email read-only
  dari signup-context, serta menampilkan Login hanya untuk EMAIL_ALREADY_EXISTS
  tanpa menyimpan email atau token handoff di URL/Web Storage.
- Menyelesaikan Phase 10 re-check dengan 154 file build dan 117 test lulus,
  menambahkan baseline security headers pada Vercel, memverifikasi parity dengan
  Apache, serta mengunci session-storage claim ke public ID tervalidasi.
- Menyinkronkan root governance, onboarding, arsitektur, deployment, security,
  file index, project structure, status, dan review report terhadap implementasi
  aktual hingga Phase 9 serta menambahkan aturan pencegahan SOT drift.
- Menyatukan loader, validasi template, Shadow DOM, renderer, dan scaling preview
  tema untuk design gallery serta unsaved card-editor preview.
- Menyatukan rule upload Resume DOCX maksimal 10 MB ke satu validator reusable
  dan kepemilikan `GET /me` ke `authService.current()`.
- Menghapus 29 `.gitkeep`, dua README pseudo-komponen stale, entry deployment dan
  reserved-slug `layouts/` kosong, serta direktori kosong hasil scaffold lama.
- Menambahkan runtime module-graph regression untuk broken import, orphan module,
  dan kepemilikan tunggal atas tanggung jawab frontend yang dibagikan.
- Menambahkan input Google Maps tervalidasi dan preview tema aktif yang mengikuti
  perubahan form kartu sebelum data disimpan.
- Menjelaskan CTA WhatsApp sebagai output turunan backend dari nomor mobile tanpa
  menerima URL WhatsApp dari browser.
- Merapikan social/catalog create-list-delete dengan urutan deterministik, posisi,
  status publik, dan copy Bahasa Indonesia; edit/reorder tetap menunggu API.
- Mencatat batas kontrak logo serta admin plan/payment/theme/QR agar frontend tidak
  menciptakan endpoint atau otoritas baru.
- Menambahkan chooser Light/Dark yang wajib pada kunjungan pertama tanpa stored
  preference, tetap dapat digunakan ketika browser menolak storage.
- Menormalkan UI checkout paused ke note exact `Under development` dan menghapus
  jalur pemanggilan checkout dari controller billing.
- Mengunci runtime locale ke Bahasa Indonesia; resource English tetap sebagai
  scaffold dormant.
- Menutup open redirect melalui validasi same-origin `returnTo` yang fail-closed.
- Menyatukan request dan link download pada configured API URL builder.
- Memperbaiki validasi panjang nama Starter dan melengkapi reserved route slug.
- Melengkapi post-login routing untuk seluruh role internal Resume Services.
- Memindahkan helper local-stack test ke dalam repository frontend sehingga full
  test suite tidak lagi bergantung pada tool monorepo lama.

## 0.4.0 — Frontend-only canonical SOT — 2026-09-01

- Menetapkan repository ini sebagai frontend-only.
- Membentuk ulang root governance dan lima dokumen SOT kanonis.
- Mencatat keputusan Starter claim, DOCX 10 MB, checkout pause, first-visit theme
  chooser, Vercel, Bahasa Indonesia launch, dan external backend boundary.
- Mendokumentasikan API dari sudut pandang frontend consumer.

## 0.3.0 — Legacy SOT quarantine — 2026-09-01

- Memindahkan 162 file legacy ke `docs/_legacy-sot/docs/`.
- Menyimpan snapshot 12 file governance di `docs/_legacy-sot/root/`.
- Memverifikasi seluruh file dengan SHA-256 sebelum dan sesudah karantina.

## 0.2.0 — Deployment output boundary — 2026-09-01

- Mengubah output Vercel dari repository root menjadi allowlisted `dist/`.
- Menambahkan static build script, `.vercelignore`, dan regression test.
- Menghentikan pola cPanel yang menyalin seluruh repository ke public root.

## 0.1.0 — Imported frontend baseline

- Static multi-page frontend, compiled Tailwind, API client, member/admin shells,
  public-card themes, dan native Node tests diambil sebagai implementation
  baseline untuk proses reintegrasi.
