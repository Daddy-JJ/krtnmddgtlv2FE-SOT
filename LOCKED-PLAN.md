# Locked Plan — MVP

Status: **LOCKED**

## Product
Digital Identity Platform.

## Membership
Starter, Basic, Pro.

## Core fields
Nama, Role/Jabatan, Organization/Perusahaan, Office Phone, Mobile Phone, Email, Website, Alamat.

## Architecture
- Frontend: HTML, Tailwind CSS Play CDN, Vanilla JavaScript
- Backend: Node.js 22.18 LTS, Express 5, strict TypeScript, MySQL2, MySQL/MariaDB
- Pattern: Modular Monolith
- API: REST JSON `/api/v1`
- Payment: Midtrans abstraction
- vCard: VCF 3.0 default; VCF 4.0 optional
- Deployment: local Node + MariaDB, cPanel Passenger when hosting supports Node Application Manager, VPS ready

## Change policy
Perubahan hanya sah melalui Change Request, Decision Log, update dokumen terdampak, dan persetujuan product owner.

## QR Code

- Self-hosted backend rendering.
- Default Node adapter: `qrcode`, isolated behind the QR renderer port.
- Payload hanya canonical public card URL.
- Tidak boleh memuat manage token, auth token, payment token, atau raw vCard.
- PNG adalah public output MVP.
- External QR API dilarang.

## Public URL format

### Starter

```text
https://kartunamadigital.id/{randomCode}
```

`randomCode`:
- exactly 7 alphabetic characters;
- allowed characters: `a-z` and `A-Z`;
- case-sensitive;
- generated only by backend;
- collision checked before persistence;
- not editable by Starter.

Example:
`https://kartunamadigital.id/aBcDeFg`

### Basic and Pro

```text
https://kartunamadigital.id/{customSlug}
```

- Editable by user in card settings.
- Must pass availability and reserved-word validation.
- Suggested initial slug:

```text
{firstTwoNameLetters}{normalizedMobileNumber}
```

Example:
`Arwan` + `081234567890` -> `ar081234567890`

## Payment gateway
- Gateway MVP: Midtrans Snap.
- Basic and Pro are annual subscriptions with a fixed 365-day entitlement term.
- Initial activation and every annual renewal require verified server-side
  payment evidence.
- Same-plan annual renewal extends from the later active end date or verified
  payment timestamp by exactly 365 days.
- Midtrans does not support automatic prorated upgrade handling for MVP.
  Upgrade checkout therefore uses backend-owned fixed transition fees:
  Starter to Basic IDR 55,000; Starter to Pro IDR 97,000; Basic to Pro
  IDR 55,000.
- A verified successful upgrade supersedes the prior membership and starts a
  new target-tier entitlement for exactly 365 days from the verified payment
  timestamp.
- Pro has no available upgrade path and must not show an upgrade CTA.
- Server Key is backend-only.
- Browser callbacks never activate membership.
- Only verified backend webhook/status can activate or extend membership.
- Provider-specific automated collection remains paused until a separate
  approved payment Change Request resumes it; this does not change the annual
  subscription product model.

## Card theme catalog

- Starter: 1 approved landscape theme.
- Basic: 3 cumulative landscape themes.
- Pro: all 10 themes — 7 landscape and 3 portrait.
- Contact data is edited once in user control panel and reused by every theme.
- Theme selection never changes VCF field mapping.

## Official transactional email
- SMTP host: `mail.kartunamadigital.id`.
- SMTP authentication and TLS are mandatory.
- Default sender: `no-reply@kartunamadigital.id`; Reply-To: `support@kartunamadigital.id`.
- Registration confirmation uses six-digit email OTP.
- OTP is single-use, ten-minute, hash-only, rate-limited, and attempt-limited.
- OTP plaintext is delivered immediately and is never persisted in the durable mail outbox; resend issues a new OTP.
- SMTP secrets live only in environment configuration.
- Application depends on `MailerInterface`, not a concrete library.

## CSRF
- Access, refresh, and Starter manage credentials remain Secure HttpOnly cookies.
- Every unsafe cookie-authenticated request requires a session-bound `X-CSRF-Token` header as defined by D-029.

## Authenticated user feedback
- All authenticated user pages use one shared responsive application shell.
- Desktop retains left workspace navigation; small screens use an accessible menu toggle.
- Page transitions are brief and respect `prefers-reduced-motion`.
- Authenticated users may submit an improvement message of 1–300 characters.
- Feedback submission is append-only, CSRF-protected, and stores no authentication credential.

## Phase 9 — Resume Enhancement and RBAC

CR-004 is approved. Pro includes one human-delivered Resume Enhancement for one
beneficiary per immutable 365-day subscription period, with three revisions,
DOCX output, 48 working-hour SLA after data completeness, and 90-day
private-file retention from the latest official release.

Authorization roles are independent from Starter/Basic/Pro. Canonical roles
are `member`, `cv_specialist`, `resume_quality_reviewer`,
`resume_service_admin`, and `super_admin`. Backend RBAC is authoritative.
