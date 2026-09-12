# Locked Frontend Plan

Status: **LOCKED**

Scope: frontend KartuNamaDigital.id dan kontrak API yang dikonsumsinya.

## Product boundary

Frontend menyediakan halaman publik, pembuatan Starter, autentikasi, claim kartu,
member workspace, public-card renderer, Resume Enhancement UI, internal workspace,
dan deployment proxy. Backend implementation, database, email delivery, payment
verification, dan server operations tidak menjadi scope repository ini.

## Stack

- HTML multi-page.
- Vanilla JavaScript ES modules.
- Tailwind CSS 4 compiled dan custom CSS.
- Fetch API melalui `services/api-client.js`.
- Native Node.js tests.
- Vercel static hosting plus Function proxy `/api/v1`.

## Membership

Tier hanya:

1. Starter
2. Basic
3. Pro

Basic dan Pro adalah membership tahunan 365 hari. Harga dan entitlement berasal
dari backend. Browser tidak boleh mengaktifkan membership.

## Starter ownership

- Form Starter dapat digunakan tanpa akun.
- Backend membuat slug tujuh huruf `a-zA-Z`, case-sensitive.
- Link email `Kelola kartu` boleh membawa token opaque untuk handoff aman.
- Pengguna baru dari link email diarahkan langsung ke Signup dengan email kartu
  terisi read-only. Login hanya ditawarkan jika backend menyatakan email sudah
  mempunyai akun.
- Pengguna wajib mempunyai akun terverifikasi sebelum claim.
- Kartu wajib diklaim ke akun sebelum dapat diedit.
- Credential atau token handoff tidak boleh disimpan di Web Storage.

## Card capability

- Core contact: nama, jabatan, organisasi, telepon kantor, nomor handphone,
  email, website, dan alamat. Pada form Starter, sapaan Mr/Mrs/Ms dan nama
  belakang bersifat opsional; nama depan tetap wajib. Website juga opsional.
- Theme access kumulatif: Starter 1, Basic 3, Pro 10.
- Social limit: Starter 0, Basic 2, Pro 5.
- Catalog limit: Starter 0, Basic 2, Pro 10.
- Maps: Basic dan Pro.
- Logo dan WhatsApp CTA dari nomor handphone publik: hanya Pro.
- QR dan vCard tersedia untuk semua tier melalui backend output.
- Artwork kartu publik tidak menampilkan label tier.

## Resume Enhancement

- Hanya Pro aktif yang eligible.
- Satu beneficiary per periode subscription.
- Dikerjakan manusia, bukan generator AI otomatis.
- Upload source hanya `.docx`, maksimal 10 MB.
- Output resmi `.docx`.
- Maksimal tiga revisi.
- File privat tersedia selama 90 hari sesuai status authoritative backend.

## Membership checkout pause

- Checkout dan aktivasi payment baru tetap paused sampai product owner
  menyatakan integrasi Midtrans API siap.
- UI boleh menampilkan benefit dan harga informatif.
- Tombol checkout tidak boleh aktif.
- Note paused wajib menggunakan teks `Under development`.
- Saat resumed melalui keputusan baru, transisi yang diizinkan adalah Starter ke
  Basic, Starter ke Pro, dan Basic ke Pro. Pro tidak memiliki upgrade CTA.

## Website theme and locale

- Website chrome mempunyai Light dan Dark palette.
- Kunjungan pertama tanpa preferensi wajib menampilkan chooser Light/Dark.
- Preferensi non-sensitive `knd.theme.preference` boleh disimpan di localStorage.
- Launch menggunakan Bahasa Indonesia.
- English dan language switcher ditunda; locale English yang ada hanya scaffold.
- Artwork kartu yang dipilih pengguna terpisah dari website Light/Dark preference.

## Deployment

- Target frontend kanonis: Vercel.
- Static output: allowlisted `dist/`.
- Browser memakai same-origin `/api/v1` pada Vercel.
- Vercel proxy memakai `BACKEND_API_BASE_URL` menuju backend HTTPS di shared
  hosting/repository terpisah.
- Postman dapat digunakan untuk verifikasi backend API, bukan sebagai runtime
  connection frontend.

## Security

- Tidak ada secret atau authentication token dalam bundle browser.
- Auth credential tetap Secure HttpOnly cookie.
- Unsafe authenticated requests memakai CSRF header.
- Return URL, external URL, file, dan response API divalidasi fail-closed.
- Data tidak tepercaya dirender melalui safe DOM APIs.
- Payment status, role, plan, entitlement, dan authorization selalu ditentukan
  backend.

## Super Admin email templates

FE-D-010 approves managing existing transactional email wording and structured
formatting through Super Admin. Stage 1 produced the inventory and editor
specification. Backend Stage 2 implemented and activated the confirmed consumer
contract locally. Frontend Stage 3 implements the editor through the existing
Super Admin shell at `/admin/mail/templates/`.
See `docs/06-EMAIL-TEMPLATE-MANAGEMENT.md`.

Draft, preview, dummy test-send, explicit publish, and version restoration must
preserve existing mail triggers and mandatory security content. SMTP settings,
tokens, rendering authority, persistence, and authorization remain backend-owned.
This approval does not authorize backend edits from this repository, new email
campaigns, or checkout activation. Each later stage requires owner instruction.

## Change policy

Perubahan locked scope memerlukan persetujuan product owner dan entry baru pada
`docs/05-DECISION-LOG.md`. Perubahan endpoint consumer juga wajib memperbarui
`docs/03-API-CONSUMER-CONTRACT.md` dan test terkait.
