# Product and Membership Contract

## Product objective

KartuNamaDigital.id membantu profesional dan bisnis membagikan identitas melalui
satu URL publik, QR, vCard, kartu visual, dan fitur tambahan sesuai membership.

## Membership matrix

| Capability | Starter | Basic | Pro |
|---|---:|---:|---:|
| Anonymous initial creation | Yes | No | No |
| Account required for editing | Yes, after claim | Yes | Yes |
| Public slug | Random 7-letter, case-sensitive | Custom | Custom |
| QR and vCard | Yes | Yes | Yes |
| Available card themes | 1 | 3 cumulative | 10 cumulative |
| Social links | 0 | 2 | 5 |
| Catalog items | 0 | 2 | 10 |
| Google Maps | No | Yes | Yes |
| Logo | No | No | Yes |
| WhatsApp CTA | Yes | Yes | Yes |
| Resume Enhancement | No | No | 1 beneficiary/period |
| Subscription term | Free | 365 days | 365 days |

Limit and entitlement response dari backend tetap authoritative. Frontend boleh
menyembunyikan atau menonaktifkan control untuk UX, tetapi tidak boleh dianggap
sebagai enforcement keamanan.

## Core card fields

- Nama lengkap. Form Starter menyusun field ini dari sapaan opsional Mr/Mrs/Ms,
  nama depan wajib, dan nama belakang opsional.
- Role/jabatan.
- Organization/perusahaan.
- Office phone.
- Nomor handphone.
- Email.
- Website (opsional pada form Starter).
- Alamat.

Maps URL, logo, social links, dan catalog mengikuti tier. WhatsApp CTA tersedia
untuk semua tier ketika nomor handphone valid. Semua theme
memakai data inti yang sama; mengganti theme tidak membuat salinan contact data.

## Starter journey

1. Pengunjung mengisi form Starter tanpa login.
2. Backend membuat kartu, public ID, dan slug tujuh huruf case-sensitive.
3. Email berisi URL publik dan link `Kelola kartu` dikirim oleh backend.
4. Link management boleh ditukar menjadi credential HttpOnly dan token harus
   dihapus dari browser URL.
5. Halaman management langsung mengarahkan pengguna baru ke Signup. Email
   diambil dari context backend, terisi read-only, dan tidak masuk URL atau
   Web Storage.
6. Login baru ditawarkan bila registrasi ditolak dengan
   EMAIL_ALREADY_EXISTS.
7. Akun wajib terverifikasi dan kartu wajib diklaim.
8. Setelah claim berhasil, pengguna dapat mengedit melalui member workspace.

Anonymous edit tidak diizinkan. Public slug bukan credential.

## Public URL

- Starter: `https://kartunamadigital.id/{sevenLetterCode}`.
- Basic/Pro: `https://kartunamadigital.id/{custom-slug}`.
- Starter code memakai tepat tujuh karakter `a-zA-Z` dan case-sensitive.
- Custom slug Basic/Pro memakai lowercase letters, digits, dan internal hyphen,
  serta harus lolos reserved-route dan availability check.
- Mengubah slug membuat link lama dan QR lama tidak lagi authoritative.

## Theme catalog

| Tier | Codes/names available |
|---|---|
| Starter | Aksara |
| Basic | Aksara, Bayu, Baskara |
| Pro | Semua sepuluh theme sampai Mahardika |

Pengguna boleh preview seluruh theme aktif, tetapi penyimpanan pilihan mengikuti
entitlement backend. Tujuh theme landscape dan tiga theme portrait menggunakan
normalized field contract yang sama.

## Resume Enhancement

- Benefit hanya untuk Pro aktif dan terverifikasi backend.
- Satu beneficiary dalam satu periode subscription.
- Source wajib Microsoft Word `.docx`, maksimum 10 MB.
- Dikerjakan manusia oleh tim berwenang.
- Maksimum tiga revisi.
- Output resmi `.docx`.
- SLA dan retention countdown berasal dari backend; UI tidak menghitung entitlement
  sendiri.
- File hanya dapat diakses user terkait dan internal role berwenang.

## Billing and upgrade

Membership Basic/Pro tetap didefinisikan sebagai annual 365-day product, tetapi
checkout baru sedang paused.

Selama pause:

- Benefit/harga boleh ditampilkan sebagai informasi.
- Semua checkout CTA disabled atau tidak dirender.
- Gunakan note exact `Under development`.
- Browser tidak membuat payment baru.
- Existing history/reconciliation hanya boleh mengikuti backend authorization.

Jika payment diteruskan melalui keputusan baru, frontend hanya mengirim target
tier. Amount, term, order, status, activation, dan allowed transition ditentukan
backend. Pro tidak menampilkan upgrade CTA.

## Website theme

Light/Dark preference berlaku untuk website chrome, bukan artwork kartu.

- First visit tanpa stored preference wajib menampilkan chooser.
- Chooser harus keyboard accessible dan tidak menghalangi halaman bila storage
  ditolak browser.
- Hanya nilai `light` atau `dark` disimpan pada `knd.theme.preference`.
- Toggle global tetap tersedia setelah pemilihan.
- Reduced-motion preference dihormati.

## Super Admin email content (implemented locally)

FE-D-010 permits editing existing user-facing email wording and structured
formatting, including Starter welcome/management, OTP, password reset, and
Resume notifications. The future editor includes drafts, preview, dummy test
email, explicit publish, version history, and restoration to draft.

Email trigger schedules, security/expiry notices, token behavior, recipient
selection, and authorization remain backend-controlled. Backend Stage 2 and the
Super Admin Stage 3 editor are active locally. No extra welcome email, campaign,
checkout activation, or Starter resend workflow is added. Confirmed contract:
`06-EMAIL-TEMPLATE-MANAGEMENT.md`.

## Language

Bahasa Indonesia adalah satu-satunya bahasa launch yang diwajibkan. English
resource yang sudah ada boleh tetap sebagai dormant scaffold, tetapi tidak boleh
menimbulkan language switcher, mixed-language acceptance criteria, atau klaim
bahwa English sudah didukung saat launch.
