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
untuk Starter, Basic, dan Pro ketika nomor handphone valid. Semua theme
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

### Verified-email recovery (FE-D-039)

If the management handoff is lost, the empty member dashboard may list unowned
Starter candidates matched by the backend to the current verified account email.
The user selects a card and explicitly confirms linking; registration, OTP,
login and listing never claim automatically. Multiple candidates are not
auto-selected. Email/ownership eligibility remains backend-authoritative.
No candidates are cached in storage or reused across accounts. The existing
email management link remains an alternative, including when recovery is not
deployed or unavailable. After confirmed claim, reload owned cards/subscription.

### Account-first without paid entitlement (FE-D-038)

Registering with intent=basic/pro does not grant entitlement. When GET /cards
is empty and no active Basic/Pro subscription exists, offer an explicit
`Mulai dengan Starter` link to /create/ and disable paid-card save. Do not
redirect automatically, transfer input or store user data. Remind users to copy
existing input before navigating. Use the existing email management, account
verification and claim flow (including Login for already registered users).
Claimed Starter editing does NOT require paid subscription. Authorized Basic/Pro
creation remains subject to backend limits. Checkout follows FE-D-041 capabilities.

## Account security UX

The authenticated `/app/account/` surface contains only password reset. It
reads the account from GET /me and uses the backend-owned email as a read-only
reset destination. OTP verification remains in the dedicated registration flow
at `/verify-email/`; it is not repeated in account settings.

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

FE-D-043 adds `Perbesar preview` for all existing themes, including locked ones.
The read-only dialog exposes readable contact details and does not save the
theme or grant any benefit. Bayu retains its dark artwork/light contact strip;
footer text sizing and explicit link contrast improve readability.

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

Owner-confirmed public informational prices (2026-10-03): Starter is free (Rp0),
Starter to Basic Rp55.000, Starter to Pro Rp97.000, and Basic to Pro Rp55.000.
Basic/Pro term remains 365 days. Homepage prices do not calculate invoices or
activate entitlement; backend remains authoritative. Paid-package links lead to
account registration only; verified users claim Starter, then check availability
in billing. Registration is not purchase or entitlement activation.

### Official merchant contact

Owner approved publishing these details on the homepage footer and Contact page:

- Email: support@kartunamadigital.id.
- WhatsApp / telephone: 0813 2821 9697 (+6281328219697).
- Address: Apt. Sentra Timur Residence O19 12B, Jl. Sentra Primer Timur,
  Cakung, Jakarta Timur. 13950, Indonesia.

These public merchant details are static HTML and remain visible without API/JS.
They are owner-provided, not independently verified legal-registration evidence.

### Checkout release gates (FE-D-041)

Owner approved production frontend source on 2026-10-09 after reporting Duitku
approval and available production credentials. UI and service share the strict
capability gate: production source is released, but only valid enabled
account-scoped capabilities allow checkout. Production CTA is
`Bayar melalui Duitku`; badges, lock icon and accessible labels follow availability.
Unavailable users retain `Under development` and disabled buttons. Failed reads
never promise checkout. No email/UUID/role allowlist or credentials in frontend.
No hosting activation, deploy or real invoice is authorized by this source patch.

Restricted sandbox (FE-D-037) uses backend-only dummy account membership.
FE-D-042 blocks NEW checkout while incompatible/multiple pending invoices need
resolution, with clear history/manual-status/support guidance. A compatible
pending invoice can be resumed without creating another purchase or rebinding
an unrelated intent. Sandbox history is retained; only backend/gateway evidence
can resolve it before a subsequent production purchase.
Capabilities is user-scoped and both environments have separate release gates.
Sandbox button remains `Uji pembayaran — Sandbox` under FE-D-040.
`Pembayaran uji — Sandbox` is a gateway label, NOT data/benefit isolation:
owner approved sharing the production database, so confirmed sandbox paid can
change dummy subscriptions/cards. Never allow customer accounts/resources into
UAT. Sandbox/unknown/legacy totals are separate from backend production gross
revenue; other operational metrics may include dummy accounts.

Membership Basic/Pro tetap didefinisikan sebagai annual 365-day product, tetapi
checkout menggunakan Duitku POP redirect. FE-D-041 supersedes the source pause
in FE-D-034; hosted activation and paid UAT remain separate release steps.

When capabilities are disabled/failed/malformed:

- Benefit/harga boleh ditampilkan sebagai informasi.
- All checkout CTA remain disabled and no checkout POST is made.
- Gunakan note exact `Under development`.
- No automatic request on page load/countdown; explicit user action is required.
- Existing history/reconciliation hanya boleh mengikuti backend authorization.

Frontend hanya mengirim target
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
