# AI Context

## Repository identity

Repository ini adalah frontend mandiri KartuNamaDigital.id. Backend, database,
mailer, payment verification, dan server-side authorization berada di repository
terpisah. Frontend mengonsumsi REST JSON `/api/v1`.

## Product

KartuNamaDigital.id menyediakan halaman identitas profesional melalui URL publik,
QR, vCard, pilihan desain kartu, social links, katalog, Maps, WhatsApp, dan layanan
Resume Enhancement sesuai tier.

Tier terkunci: Starter, Basic, Pro.

## Locked owner decisions

- Starter dibuat anonim, tetapi edit hanya setelah Login/Signup dan claim kartu.
- Resume source wajib DOCX maksimal 10 MB.
- Checkout membership paused; gunakan note `Under development`.
- First-visit Light/Dark chooser wajib.
- Frontend di-host di Vercel.
- Backend berada di repository terpisah dan shared hosting, terhubung melalui API.
- Launch Bahasa Indonesia; English ditunda.
- SOT ini frontend-only.

## Actual frontend architecture

- Static multi-page HTML.
- Vanilla JavaScript ES modules.
- Tailwind CSS 4 compiled plus custom CSS.
- `pages/` sebagai page controller.
- `services/` sebagai API dan presentation boundary.
- `components/` untuk shared UI/runtime composition.
- `validators/` dan `utils/` untuk logic browser yang dapat diuji.
- `api/v1/[...path].js` sebagai Vercel proxy ke backend HTTPS.
- `scripts/build-static.mjs` membentuk allowlisted `dist/`.

## Security boundary

Auth memakai Secure HttpOnly cookies dari backend dan CSRF header untuk request
unsafe. Satu-satunya preferensi yang diizinkan di `localStorage` adalah
`knd.theme.preference`. `sessionStorage` hanya boleh menyimpan konteks navigasi
non-secret yang diizinkan secara eksplisit; tidak pernah credential.

Payment, entitlement, plan access, role, slug availability, file authorization,
dan hasil validasi final tetap authoritative di backend.

## Current readiness gaps

- Super Admin email template management has an active local backend contract and
  an implemented editor/service adapter at `/admin/mail/templates/`. Authenticated
  browser and designated-mailbox UAT remain external readiness evidence.
- Edit/reorder social links dan catalog menunggu method, path, payload, serta
  authorization backend yang disinkronkan.
- Logo upload/delete serta mutasi admin plan/payment/theme dan QR regeneration
  belum mempunyai kontrak API frontend yang disetujui.
- Vercel Preview, browser integration terhadap backend staging, dan UAT perangkat
  nyata masih diperlukan sebelum production-readiness dapat disetujui.

Lihat `STATUS.md` untuk daftar lengkap dan status validasi terakhir.
