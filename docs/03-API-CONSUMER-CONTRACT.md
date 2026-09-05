# Frontend API Consumer Contract

## Boundary

Dokumen ini mencatat REST operations yang dibutuhkan frontend. Ia bukan OpenAPI
backend dan tidak mengatur database atau server implementation. Backend repository
terpisah tetap authoritative untuk request validation, RBAC, persistence, payment,
email, file storage, and response schema.

## Base URL

- Browser default: `/api/v1`.
- Local development: when the public placeholder is still active and the
  frontend hostname is exactly `127.0.0.1` or `localhost`, the browser uses
  `http://127.0.0.1:3000/api/v1` so the separate Express backend is reached
  directly. Both local hostnames intentionally use the backend hostname
  `127.0.0.1` for cookie consistency.
- Vercel: same-origin `/api/v1` diteruskan oleh `api/v1/[...path].js`.
- Server-side upstream: `BACKEND_API_BASE_URL`, HTTPS origin tanpa path.
- Fallback direct base hanya melalui reviewed public runtime configuration.

Runtime precedence is server-owned `globalThis.__KND_CONFIG__`, then an injected
public API base, then the local-host fallback above, and finally same-origin
`/api/v1`. An injected non-placeholder value is never replaced by local host
detection. The backend must allow credentialed CORS from the active local frontend
origin; prefer `http://127.0.0.1:8080` for development.

Feature services menerima path relatif setelah `/api/v1`. Request API dan link
download runtime dibentuk melalui `buildApiUrl()` agar seluruhnya menghormati
configured API base yang sama.

## Transport contract

- Request authenticated memakai `credentials: include`.
- `Accept: application/json` dan unique `X-Request-ID` dikirim.
- JSON request memakai `Content-Type: application/json`.
- File upload memakai `FormData`; browser menentukan multipart boundary.
- Default timeout 12 detik.
- Satu 401 dapat memicu satu refresh lalu satu retry, kecuali request memilih
  `skipRefresh`.
- Unsafe cookie-authenticated method memakai `X-CSRF-Token`.

CSRF contexts:

- `access`: authenticated account session.
- `starter`: link-management/claim session bila endpoint memerlukannya.
- `null`: endpoint publik yang memang tidak memakai cookie-auth CSRF.

## Response and error envelope

API client menerima payload langsung atau envelope sukses dengan property `data`.
Error dinormalisasi menjadi:

```json
{
  "status": 422,
  "code": "VALIDATION_FAILED",
  "message": "Request failed.",
  "details": {},
  "requestId": "..."
}
```

Backend may provide `code`, `message`, `errors`/`data`, and `request_id`. UI harus
menampilkan pesan aman serta request ID bila tersedia, tanpa membocorkan stack,
SQL, storage path, token, atau internal exception.

## Consumed endpoint families

### Authentication and account

| Method | Path | Use |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/email/verify-otp` | Verify email OTP |
| POST | `/auth/email/resend-otp` | Resend email OTP |
| POST | `/auth/login` | Start account session |
| POST | `/auth/logout` | Revoke account session |
| POST | `/auth/refresh` | Rotate/refresh session |
| GET | `/auth/csrf` | Bootstrap access CSRF token |
| POST | `/auth/forgot-password` | Request reset email |
| POST | `/auth/reset-password` | Consume reset token |
| GET | `/me` | Current user and roles |

### Starter

| Method | Path | Use |
|---|---|---|
| POST | `/starter/cards` | Anonymous Starter creation |
| POST | `/starter/access` | Exchange email management handoff |
| PUT | `/starter/cards/{publicId}` | Update after authorized account flow |
| POST | `/starter/cards/{publicId}/claim` | Claim into verified account |

The UI must not expose anonymous edit controls. Handoff tokens must not persist in
the URL or Web Storage.

Starter creation permits up to 30 seconds for the synchronous SMTP attempt.
The client must not retry this POST after a timeout because the card may already
be persisted. A successful card response is rendered even when
data.emailSent is false or absent; only an explicit boolean true is shown as
email delivered. The email handoff is posted to /starter/access with
{ publicId, token }, credentials included, and no CSRF header. A successful
exchange removes the token fragment from browser history; HTTP 401 is presented
as an invalid, expired, or already-used link.

### Cards and design

| Method | Path | Use |
|---|---|---|
| GET/POST | `/cards` | List/create account cards |
| GET/PUT | `/cards/{publicId}` | Read/update card |
| POST | `/cards/{publicId}/publish` | Publish card |
| GET | `/cards/slug-suggestion` | Advisory suggestion |
| GET | `/cards/slug-availability` | Availability check |
| PATCH | `/cards/{publicId}/slug` | Change custom slug |
| GET | `/cards/{publicId}/themes` | Theme catalog/access |
| PATCH | `/cards/{publicId}/theme` | Save theme selection |

`PUT /cards/{publicId}` may submit nullable `contact.mapsUrl`; the frontend
accepts only an HTTP(S) URL and the backend remains authoritative for Basic/Pro
access. `whatsappUrl` is a read-only public aggregate value derived by the
backend from the saved mobile number for eligible Pro cards; the browser must not
submit or persist a WhatsApp URL. A saved `logoUrl` may be rendered, but no logo
upload/delete operation is approved in this consumer contract yet.

### Social and catalog

| Method | Path | Use |
|---|---|---|
| GET/POST | `/cards/{id}/social-links` | List/create social links |
| DELETE | `/cards/{id}/social-links/{linkId}` | Delete social link |
| GET/POST | `/cards/{id}/catalog-items` | List/create catalog items |
| DELETE | `/cards/{id}/catalog-items/{itemId}` | Delete catalog item |

Update/reorder operations are not yet represented in current frontend services.
They require synchronized backend contract before implementation.

### Public content and card output

| Method | Path | Use |
|---|---|---|
| GET | `/public/content/landing` | Optional typed landing wording |
| GET | `/public/cards/{slug}` | Public normalized card aggregate |
| GET | `/public/cards/{slug}/vcard` | Download vCard |
| GET | `/public/cards/{slug}/qr` | QR image/download |

Slug casing must be preserved. Public output URLs must use the configured API
base builder rather than hard-coded origin/path construction.

### Subscription, payment, and feedback

| Method | Path | Use |
|---|---|---|
| GET | `/subscriptions/current` | Current entitlement summary |
| GET | `/payments` | Payment history |
| POST | `/payments/checkout` | Dormant adapter; UI invocation paused |
| POST | `/payments/{publicId}/reconcile` | Authorized status refresh |
| POST | `/feedback` | Authenticated improvement message |

Checkout must not be invoked while the product decision remains paused.

### Resume Enhancement

| Method | Path | Use |
|---|---|---|
| GET | `/resume-service/eligibility` | Pro benefit eligibility |
| GET/POST | `/resume-requests` | List/create requests |
| GET | `/resume-requests/{id}` | Request detail |
| POST | `/resume-requests/{id}/files` | Authorized multipart DOCX upload |
| POST | `/resume-requests/{id}/revision` | Request revision |
| GET | `/resume-requests/{id}/files/{fileId}/download` | Authorized file download |
| GET | `/resume-requests/{id}/deliverables/current/download` | Released result |

Internal resume operations currently consume `/admin/resume-requests*` transitions
for queue/detail, assign, information request, data complete, work start, revision
start, deliverable registration, and release. Backend permission filtering is
authoritative untuk role code `super_admin`, `cv_specialist`,
`resume_quality_reviewer`, dan `resume_service_admin`. Login mengarahkan dua role
resume terakhir ke workspace Resume Services yang sesuai; backend tetap melakukan
authorization setiap operasi.

### Super Admin

Current pages consume read/mutation families under `/admin` for statistics, users,
cards, subscriptions, usage, interventions, settings/activity, mail outbox,
CV specialists, landing content, and Resume Services. High-risk mutations require
backend permission, CSRF, confirmation/reason where applicable, recent auth when
required, and immutable audit.

The current activity surface is read-only through `GET /admin/activity`. No exact
method/path/payload is approved here for plan mutation, admin payment mutation,
theme-catalog mutation, or QR regeneration. Those controls must not be added until
the backend contract and its authorization/audit behavior are synchronized.

## Contract change procedure

For any endpoint, method, payload, response, role, or CSRF-context change:

1. Update feature service/API client usage.
2. Update this document.
3. Add or update frontend contract tests.
4. Coordinate the corresponding OpenAPI/test change in the backend repository.
5. Verify through staging integration or Postman before production.
