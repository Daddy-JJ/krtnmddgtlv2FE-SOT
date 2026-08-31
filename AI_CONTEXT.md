# AI Context

## Product

Digital Identity Platform menyediakan halaman identitas bisnis digital dengan URL publik, QR Code, ekspor VCF, desain kartu, social links, katalog sesuai plan, Google Maps, dan upgrade melalui payment gateway.

## Target

Profesional, sales, freelancer, pemilik UMKM, dan usaha jasa.

## Membership locked

Starter, Basic, Pro.

Basic dan Pro adalah annual subscription dengan term entitlement terkunci 365
hari. Harga berasal dari backend; aktivasi dan renewal hanya setelah payment
evidence terverifikasi server-side. Browser callback tidak authoritative.

## Starter nuance

Starter tanpa login tetapi tetap dapat diedit memakai **Starter Manage Token**. Token acak, berbeda dari public slug, dan hanya hash-nya disimpan di server.

Upgrade Starter: register/login → claim card dengan manage token → token dicabut → pilih plan → payment.

## Architecture

- Modular monolith
- REST API
- MySQL/MariaDB
- Node.js 22.18 LTS + Express 5 + strict TypeScript
- MySQL2 prepared statements; no ORM for MVP
- Same-origin deployment untuk MVP
- JWT access token pendek + refresh token rotation melalui Secure HttpOnly cookies
- Unsafe cookie-authenticated requests require the session-bound `X-CSRF-Token` header
- Service layer memegang business rule
- Repository layer memegang persistence
- Policy layer memegang authorization

## Tailwind note

Tailwind Play CDN diizinkan untuk prototype/MVP sesuai keputusan. Sebelum public production, CSP dan performa harus direview. Migrasi ke compiled Tailwind diperbolehkan sebagai hardening teknis tanpa mengubah scope produk.

## Rendering boundary

`QrCodeRenderingService` dan `VCardRenderingService` adalah service terpisah. Card business logic tidak bergantung langsung pada library QR.

## Slug rules

- Public card routes use the domain root path, not `/c/{slug}`.
- Starter slug is a backend-generated, case-sensitive, seven-letter code using `a-zA-Z`.
- Basic/Pro custom slug is editable.
- Suggestion algorithm: first two alphabetic characters of normalized first name, lowercase, followed by normalized mobile number digits.
- Suggestion is not automatically final until availability is confirmed.

## Midtrans
Use PaymentGatewayPort with MidtransSnapGateway. Membership services must not
depend directly on `midtrans-client`. Store immutable plan/price/duration
snapshots on each payment. Basic/Pro snapshots must use the locked annual
`durationDays=365`; provider-specific automated collection remains paused
until its payment Change Request resumes. Midtrans does not provide automatic
prorated membership upgrades for this MVP, so upgrade checkout is managed by
internal fixed transition fees only: Starter to Basic IDR 55,000, Starter to
Pro IDR 97,000, and Basic to Pro IDR 55,000. Pro has no upgrade CTA. A verified
successful upgrade starts a new target-tier 365-day entitlement from the
verified payment timestamp.

## Theme context

Use `frontend/config/theme-registry.json` as frontend theme metadata and the database `themes`/`plan_theme_access` records as backend authority.
Every theme binds to the same normalized card field contract.
The physical card row stores `theme_id`; API/frontend use the joined immutable `themeCode`.

## Email context
`TransactionalService -> MailerPort -> CpanelSmtpMailer -> mail.kartunamadigital.id`.
Use Nodemailer only inside the SMTP adapter. Never log OTP or SMTP credentials. OTP plaintext exists only in memory during immediate delivery and is never written to the durable mail outbox; non-OTP transactional mail uses the outbox/retry worker.
