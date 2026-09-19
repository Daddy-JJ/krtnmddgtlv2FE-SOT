# Changelog

Perubahan historis monorepo sebelum reintegrasi telah dikonsolidasikan ke
dokumentasi kanonis repository ini.

## Unreleased

- Mendokumentasikan migrasi backend shared hosting ke `sierra` /
  `nimbus_plus` dengan shared IP `202.155.137.45`; domain, API path, dan
  layout remote tetap. IP lama `202.10.43.184` dinyatakan superseded.
- Mencatat baseline DNS panel Domainesia serta potensi konflik record apex/www
  shared hosting dengan target frontend Vercel; record mail/SPF tidak diubah.

- SEO: optimasi 10 halaman publik untuk intent kartu nama digital; metadata
  unik, Open Graph/Twitter, heading utama, internal link artikel, structured
  data dan tanggal sitemap. Koreksi FAQ Starter/WhatsApp dan input CV DOCX
  mengikuti SOT. Delapan redirect admin kini noindex; seluruh 159 tes lulus.

- Melanjutkan normalisasi Foundations lintas halaman: scope pada html,
  skala tipografi bersama, panel semantic, kontrol form, navigasi admin,
  tombol sekunder, chooser tema, serta spacing artikel. Sistem font lokal
  dinyatakan eksplisit tanpa ketergantungan CDN. QA: 157 test lulus.
  QA browser memakai fixture API; UAT dengan data nyata tetap diperlukan.

- Menggabungkan manfaat + profil dan keamanan + CTA menjadi dua section landing
  ringkas; mempertahankan 25 field teks admin, memperbaiki kontras footer,
  dan memverifikasi desktop/mobile Light/Dark. Audit konsistensi 51 shell
  beserta temuan yang masih pending dicatat pada REVIEW-REPORT.md.
- Merollout adapter Foundations ke seluruh 51 route shell aktif (marketing, auth, member workspace, internal workspace, dan blog), dengan public-card serta redirect compatibility tetap dikecualikan.
- Menormalisasi landing page ke role Foundations untuk reading measure, spacing, surface light/dark, dan skala headline tanpa mengubah kontrak API; ilustrasi pada dua pasangan section kemudian diringkas melalui FE-D-027.
- Menambahkan pilot visual system berbasis prinsip Supertype Foundations pada
  enam route perwakilan, dengan semantic light/dark tokens, tipografi, primitive
  komponen, regression test, dan atribusi MIT. Sepuluh desain kartu nama dan
  artwork kartu publik secara eksplisit tidak diubah.
- Menormalkan spacing dan layout pilot melalui satu scale kanonis, menghapus
  akumulasi hero/dekorasi lama, serta memasukkan halaman Contact sehingga tujuh
  route review memiliki ritme visual yang konsisten.
- Memadatkan heading editorial Foundations pada desktop, melebarkan reading
  measure agar judul About tidak terpecah menjadi tiga baris, dan menghapus
  aksen garis panel warisan pada route pilot.
- Merefactor resep marketing About, FAQ, dan Contact ke peran tipografi semantic, grid Card responsif, dan Disclosure native agar skala judul, reading rail, serta interaksi FAQ mengikuti prinsip Foundations tanpa mengubah kartu publik atau kontrak API.
- Membuat pembacaan file .env pada npm run dev bersifat opsional sehingga
  default lokal aman tetap dapat dipakai tanpa membuat atau menimpa .env.
- Menghapus snapshot `docs/_legacy-sot/` setelah dokumentasinya dikonsolidasikan
  ke `docs/` utama.

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

- Mengarantina 162 file legacy dan 12 file governance selama reintegrasi.
- Memverifikasi seluruh file dengan SHA-256 sebelum dan sesudah karantina.

## 0.2.0 — Deployment output boundary — 2026-09-01

- Mengubah output Vercel dari repository root menjadi allowlisted `dist/`.
- Menambahkan static build script, `.vercelignore`, dan regression test.
- Menghentikan pola cPanel yang menyalin seluruh repository ke public root.

## 0.1.0 — Imported frontend baseline

- Static multi-page frontend, compiled Tailwind, API client, member/admin shells,
  public-card themes, dan native Node tests diambil sebagai implementation
  baseline untuk proses reintegrasi.
