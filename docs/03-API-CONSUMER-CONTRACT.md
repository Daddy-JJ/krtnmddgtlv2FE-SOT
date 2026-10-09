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
- Production browser hosts `kartunamadigital.id`, `www.kartunamadigital.id`,
  and `krtnmdgtlv2-fe-ten.vercel.app` use
  `https://api.kartunamadigital.id/api/v1` directly.
- Same-origin fallback `/api/v1` is forwarded by `api/v1/[...path].js`.
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
- Default timeout tanpa environment override adalah 12 detik; production
  injects `PUBLIC_API_TIMEOUT_MS=30000`.
- Hanya `401 AUTH_REQUIRED` pada read request `GET/HEAD` yang dapat memicu
  satu refresh lalu satu replay. Jika refresh gagal, error diteruskan tanpa
  loop dan UI mengarahkan user ke Login.
- `401 INVALID_CREDENTIALS` bukan session expiry dan tidak boleh memicu
  refresh. Mutasi dan request yang timeout tidak pernah direplay otomatis.
- Unsafe cookie-authenticated method memakai `X-CSRF-Token`.
- Jika mutation idempotent `PUT/PATCH/DELETE` ditolak dengan
  `403 CSRF_INVALID`, client membuang token access yang tersimpan, mengambil
  token baru dari `/auth/csrf`, lalu mengulang tepat satu kali. `POST` tidak
  direplay agar operasi non-idempotent tidak menjadi double-submit.
- `429 RATE_LIMITED` dan `503 AUTH_BUSY` memiliki recovery copy tersendiri.
  Timeout client tetap aktif ketika caller juga memasok `AbortSignal`.
- Logout melakukan satu sinkronisasi eksplisit melalui `GET /auth/csrf`
  sebelum mengirim satu `POST /auth/logout` dengan token terbaru. Ini bukan
  retry mutation; bila logout tetap ditolak `CSRF_INVALID`, UI menampilkan
  error dan mempertahankan sesi.

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

API errors also retain the response HTTP `status`, raw `retryAfter` header,
normalized `retryAfterSeconds` (null when absent/invalid), and `requestId` from
the envelope or X-Request-ID header. Retry-After accepts nonnegative integer
seconds or a valid IMF-fixdate HTTP-date; past dates normalize to zero. Negative,
malformed and non-HTTP dates are rejected. Headers remain memory-only, without
logging cookie/token/signature/payment URLs or queries. Never use `no-cors`.

## Consumed endpoint families

### Starter verified-email recovery (FE-D-039)

- GET /starter/claim-candidates?limit=20&offset=0: authenticated, verified
  account. Offset 0..1000 in pages of 20. No email/userId request fields.
  Envelope data: {items:[{publicId,displayName,slug,createdAt}],limit,offset,hasMore}.
- POST /starter/claim-candidates/{publicId}/claim: explicit confirmation only,
  body {confirm:true}, normal access CSRF (NOT starter CSRF), cookie credentials.
  Fresh session CSRF is synchronized first; POST is never automatically retried.
  Envelope data: {card:{publicId,displayName,slug,createdAt},alreadyOwned:boolean}.
  Both false and true mean successful server-confirmed ownership outcome.
- Both responses no-store; frontend validates envelope and projects approved
  fields only. Candidates stay in page memory, cleared on session/page change;
  pending reads are aborted/late responses discarded. No publicId proves ownership.
- On success clear pending management navigation and reread GET /cards and
  /subscriptions/current. No local ownership assignment. On 409 or
  STARTER_NOT_ELIGIBLE reread dashboard/candidates without replaying POST.
- Distinct errors: 401 AUTH_REQUIRED -> login; 403 EMAIL_VERIFICATION_REQUIRED
  -> verification; CSRF_INVALID -> reload; 404 STARTER_NOT_ELIGIBLE -> refreshed
  availability; 409 STARTER_ALREADY_OWNED/PLAN_LIMIT_REACHED -> safe ownership/
  account-limit explanation; 422 VALIDATION_ERROR -> validation; 429 RATE_LIMITED
  -> honor Retry-After with 30s fallback, manual retry only. Network/timeout/5xx
  -> uncertainty, never claim success. Generic 404 means service unavailable,
  not proof that the user's card does not exist. Retain email/support alternative.
- Authority: read-only backend docs/STARTER-RECOVERY.md and
  STARTER-RECOVERY.openapi.json. Local contract is not hosting deployment proof.

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
| GET | `/me` | Current user, verified-email state, and roles |
| PUT | `/me` | Existing email-change caller only; no current account UI |

Forgot-password UX uses the existing `POST /auth/forgot-password` response only;
it does not require `emailSent`, `queued`, `jobId`, or `cooldownSeconds` fields.
The frontend guards duplicate submits, starts a 360-second UX cooldown after
HTTP 200, and stores only the absolute deadline timestamp in tab-scoped
`sessionStorage` under `auth.forgotPassword.cooldownUntil`. The countdown never
submits automatically and does not apply to `/reset-password/` token changes.
For `429 RATE_LIMITED`, the client honors a valid `Retry-After` response header;
without it, the frontend uses a six-minute UX pause without promising when the
server limit ends. Network, timeout, and HTTP 5xx responses use a 60-second
uncertain-status pause and never replay this POST. These controls do not replace
backend rate limiting, worker locking, or reset-job deduplication.

Token reset password baru dibaca dari fragment
`/reset-password/#token=<token>` ke memori controller, lalu fragment segera
dihapus melalui `history.replaceState`. Query `?token=` lama tetap dibaca
selama transisi 30 menit dan juga langsung dibersihkan. Fragment tidak pernah
dipindah ke query; token/password tidak disimpan di Web Storage atau log dan
token hanya dikirim pada body JSON `POST /auth/reset-password`.

`PUT /me` untuk perubahan email membutuhkan
`{ email, currentPassword }`, cookie, access CSRF, dan autentikasi maksimal
15 menit. `401 INVALID_CREDENTIALS` berarti password saat ini salah tanpa
refresh/retry. `403 RECENT_AUTH_REQUIRED` meminta Login ulang. Jika email
berubah, seluruh sesi dicabut, email kembali unverified, dan user melanjutkan
OTP lalu Login ulang. Frontend saat ini tidak memiliki menu/caller perubahan
email, sehingga kontrak ini tidak menambah UI baru.

Public `GET /health` sukses hanya mensyaratkan
`data.status === "healthy"`; consumer tidak bergantung pada database,
environment, atau latency.

### Starter

| Method | Path | Use |
|---|---|---|
| POST | `/starter/cards` | Anonymous Starter creation |
| POST | `/starter/access` | Exchange email management handoff |
| GET | `/starter/cards/{publicId}/signup-context` | Read the cookie-authorized Starter email for Signup |
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

After exchange, the frontend goes directly to Signup. It requests
`signup-context` with credentials included and no CSRF header, then shows only
the returned email as a read-only form value. Email and handoff token must not be
copied into query parameters or Web Storage. HTTP 401 means the management
context is unavailable. A registration response with HTTP 409 code
`EMAIL_ALREADY_EXISTS` reveals the Login recovery route while preserving the
safe `returnTo`.

Starter creation sends one backend `contact.fullName` assembled from optional
Mr/Mrs/Ms, required first name, and optional last name. An omitted website is
sent as `websiteUrl: ""`; non-empty websites still require HTTP(S).

### Cards and design

First-card save hardening (2026-10-04): the member editor requires GET /cards to
be an actual array of valid publicId entries before choosing empty/create mode.
An existing card must have matching publicId and contact detail; malformed load
locks save rather than falling back to create. POST /cards remains the legitimate
first-card operation; existing-card edits use PUT /cards/{publicId}.

CardService create/update synchronize GET /auth/csrf through the existing client
before mutation, then force the synchronized access token rather than a stale
readable cookie. Credentials stay include. Failed synchronization prevents save.
POST has no auth/CSRF/timeout replay; existing bounded PUT CSRF recovery remains.
The editor sets an in-flight guard before awaiting CSRF/save and disables controls.
CSRF rejection preserves input for explicit retry. Ambiguous first-card POST
(timeout/network/5xx/invalid successful response) blocks further creation until
reload rereads owned cards; no automatic resend or guessed success.
Registration intent=basic/pro never grants paid entitlement or bypasses backend
creation eligibility. Checkout follows FE-D-041 and backend capabilities.

Starter CTA (FE-D-038): after a validated empty card list, read
GET /subscriptions/current through the existing payment service. Null/404 or
a valid inactive/expired Basic/Pro response offers `Mulai dengan Starter` at
/create/ and blocks paid-card save. An active Basic/Pro response with valid
current startsAt/endsAt permits the form, but is not an authorization grant.
Failed/malformed reads lock save without claiming the account is unpaid.
Owned-card edits, including claimed Starter, skip this paid-subscription check.
403 PAID_ENTITLEMENT_REQUIRED during save shows the same CTA without replay,
automatic redirect or input loss. Intent/query does not determine entitlement.

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
accepts only an HTTP(S) URL and the backend remains authoritative for tier
access. WhatsApp CTA is available for Starter, Basic, and Pro. The browser must
not submit or persist a WhatsApp URL. Backend-provided `whatsappUrl` is derived
from a valid saved Indonesian mobile number; the frontend validates the HTTPS
`wa.me` shape before rendering it. A saved
`logoUrl` may be rendered, but no logo
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
The Inovasia website showcase embeds the existing homepage URL `/`. That route
and `/preview/*` allow framing only from `https://inovasia.co.id` and
`https://www.inovasia.co.id` through response CSP. Root public slugs and private
routes remain frame-denied. `/preview/` still serves the homepage shell (with a
top-level redirect to `/`), and `/preview/{slug}` serves a public-card preview.
These presentation routes create no second card API or management credential.
Starter slugs are exactly seven ASCII letters and immutable; Basic/Pro custom
slugs follow the separate lowercase validation and authorization contract. QR
PNG contains the backend canonical public URL, not raw contact data.

### Subscription, payment, and feedback

| Method | Path | Use |
|---|---|---|
| GET | `/subscriptions/current` | Current entitlement summary |
| GET | `/payments` | Payment history |
| GET | `/payments/capabilities` | Fail-closed provider/release capabilities |
| GET | `/payments/{publicId}` | Owned payment detail |
| POST | `/payments/checkout` | Production source FE-D-041 / restricted sandbox FE-D-040; valid enabled capabilities required |
| POST | `/payments/{publicId}/reconcile` | Authorized status refresh |
| POST | `/feedback` | Authenticated improvement message |

FE-D-041 releases production frontend source, not hosting or actual transactions.
Restricted sandbox follows FE-D-040; real UAT execution is separately authorized.
Status payment `refunded` dan `refund_pending_review` harus dirender berbeda.
Setelah reconciliation, subscription, payment history, dan cards dimuat ulang
dari backend; tier/benefit tidak ditentukan dari cache frontend.

#### Duitku POP compatibility (2026-10-02, FE-D-034)

Restricted sandbox alignment (2026-10-04, backend source `2f24a89`):
capabilities.checkoutEnabled is scoped to the authenticated user, including
backend sandbox membership. No frontend allowlist or admin-role bypass exists.
Read capabilities after login and on each billing load/explicit checkout; do not
cache across accounts. Logout/auth transitions and cross-tab notification clear
billing data/capabilities, and late old-session responses are discarded. The
production release constant is true under FE-D-041. FE-D-040 retains a separate
sandbox flag: paymentCheckoutAllowed requires valid capabilities,
checkoutEnabled:true, provider:duitku and the matching environment release flag.
UI submit, history payment links and service checkout share this gate. Service
rereads capabilities before POST; checkout response provider/environment must
match capabilities. History redirects require the same environment too. No
frontend allowlist or hosting activation is introduced.

`403 PAYMENT_SANDBOX_FORBIDDEN` closes checkout and displays
`Pembayaran uji hanya tersedia untuk akun pengujian yang disetujui` without
CSRF recovery, auth refresh, or replay. Preserve checkout-disabled/gateway-
unavailable errors, 202, Retry-After and X-Request-ID. Sandbox payment rows and
billing notes show `Pembayaran uji — Sandbox`. Sandbox shares the production
database by owner decision; paid can change dummy subscription/card benefits.
This is NOT entitlement isolation. Unknown/null environments remain unknown.
No credential/list is exposed and no sandbox transaction is authorized here.

Canonical backend references, read-only: `docs/DUITKU-PAYMENTS.md`,
`docs/PAYMENTS.openapi.yaml`, and backend `STATUS.md`. Source compatibility does
not establish live deployment or sandbox readiness.

- GET capabilities after successful login and on entering billing. Require
  `success:true`, provider `duitku`, sandbox/production environment, boolean
  `checkoutEnabled`, `idempotencyKeyRequired:true`, integer cooldown >=30 seconds.
  Failed/malformed/unavailable capabilities close checkout. Capabilities do not
  prove per-user eligibility. `PAYMENT_CHECKOUT_RELEASED=true` records FE-D-041's
  source approval, not a bypass of disabled capabilities or backend eligibility.
  Runtime config cannot override either environment release flag.
- Checkout body ONLY `{planCode:'basic'|'pro'}` plus UUID `Idempotency-Key`.
  Existing client owns credentials/include, JSON, CSRF and transport. Checkout
  and reconcile explicitly synchronize access CSRF and use that fresh token.
  Neither POST is automatically replayed after auth, CSRF, timeout or 5xx.
  Read requests preserve existing AUTH_REQUIRED refresh-once behavior.
- 201/202 mean checkout retrieved/pending, never automatic payment success.
  Payment status and invoiceState (`creating/ready/unknown/verified/legacy`)
  are separate. Nullable redirectUrl/environment/expiresAt remain nullable.
  Missing URL shows `Pembayaran sedang diverifikasi. Jangan membuat pembayaran
  baru.` Deadline expiry never mutates payment status or entitlement locally.
- Persist only user publicId, planCode, UUID and payment publicId. SessionStorage
  is a navigation mirror; IndexedDB contains the same minimal metadata for
  durable coordination under a Web Lock across tabs. No email, authentication
  token, provider reference, URL, price or provider payload is stored. Failed
  shared persistence or missing Web Locks closes creation; history/return still
  work. Existing owned pending payments are read before an explicit retry. An
  enabled fresh capability response is required even when resuming history.
  FE-D-042: classify pending provider/environment/targetPlanCode against current
  capabilities/selected plan before resuming. Sandbox-to-production, unknown or
  retired context, different plan and multiple pending records block NEW orders;
  do not filter away old evidence and issue a replacement checkout. Matching
  owned detail is revalidated. Reading history or a 409 publicId is NOT evidence
  that it belongs to the current UUID; never bind an unrelated intent to it.
  CHECKOUT_PENDING_EXISTS reads owned detail and gives manual resolution guidance
  without resubmitting. The frontend-only presentation codes
  PAYMENT_SANDBOX_PENDING/PAYMENT_PENDING_CONTEXT_CONFLICT are not new API codes.
  Pending UI disables conflicting plan buttons and preserves manual reconcile.
  An ambiguous attempt preserves its key until a terminal server state is known.
  Logout/user changes clear metadata and auth transitions invalidate old
  controllers. Re-authentication of the same user preserves an ambiguous intent.
- A redirect requires provider duitku, pending status and strict URL parsing:
  HTTPS exact host `app-sandbox.duitku.com` or `app-prod.duitku.com` according to
  payment environment, exact `/redirect_checkout`, no userinfo/nondefault port/
  fragment, exactly one nonempty `reference` parameter and no extra query keys.
  No Snap/Duitku SDK, merchant API call or new provider CSP permission is needed.
- `/app/billing/result/` is noindex and no-referrer. Its early script captures
  only a bounded merchantOrderId lookup hint in memory and removes query/hash
  before other application scripts. resultCode/reference are never trusted.
  Resolve saved payment publicId through owned GET detail, otherwise match
  merchantOrderId inside owned GET history only. Unknown match shows history;
  if a saved intent belongs to a different return order, match the hint only
  against owned backend history and then read owned detail, or show history.
  Never replace the intent from this hint or hide other pending history rows.
  inaccessible detail shows a safe error. No frontend payment callback exists.
- Manual reconcile returns outcome `{result,paymentPublicId,paymentStatus}`;
  reread payment detail afterward. Apply an absolute >=30-second cooldown and
  honor valid Retry-After on 429 (also checkout). No polling or automatic POST
  when countdown expires. Paid triggers fresh subscription/cards; entitlement
  remains server-authoritative. Billing timers/listeners stop on SPA page leave.
- Validation errors are rendered with fixed safe guidance for arbitrary errors
  shapes. Distinguish AUTH_REQUIRED, CSRF_INVALID, CHECKOUT_NOT_ALLOWED, 404,
  IDEMPOTENCY_CONFLICT, CHECKOUT_PENDING_EXISTS (owned data.publicId), 429 and 503.
  Provider mismatch/invalid redirect/ambiguous outcomes stop for history/support.
  Only Duitku is supported for processing (FE-D-035); unknown providers are
  blocked from redirect/reconcile. HTTP 410 gives generic support guidance,
  without a replacement order. Refund/refund
  pending review labels remain distinct; no frontend refund operation is added.
  Historical provider names use bounded safe plain text only, without restoring
  any provider-specific checkout/SDK integration.

Release order: verify compatible backend with checkout disabled, deploy approved
frontend source (capabilities keep it closed), then separately authorize hosting
activation, controlled paid UAT and public opening. A production account gate,
if needed for restricted UAT, must be implemented in backend: sandbox allowlisting
does not restrict production. Return URL must match `/app/billing/result/`
on the approved test/production origin. Migration 013/local backend QA are not
proof of hosting migration/deployment. Credentials belong only to backend.

Backend CORS source rechecked read-only (2026-10-02): configured exact origins
now receive `Access-Control-Expose-Headers: Retry-After, X-Request-ID`, credentials,
Idempotency-Key preflight allowance and `Vary: Origin`. These backend changes
are local and not assumed committed/deployed. An exposed header can still be
absent on an endpoint response. Frontend uses the capabilities cooldown fallback
(safe default 30 seconds), with reconcile always >=30 seconds and a longer valid
Retry-After honored. Checkout follows the same fallback without changing its
backend capability gate. Absolute deadlines never schedule retries automatically.
Browser mock covers missing/exposed headers and HTTP-date; this is not live CORS
evidence. Port 3000 was unavailable during this frontend pass; real backend
browser verification and deployed allowed-origin 429 checks remain pending.

Merchant callback is POST
`https://api.kartunamadigital.id/api/v1/payments/duitku/callback`, backend/provider
only. It is NOT the user return URL `/app/billing/result/`. No frontend callback
request or merchant credential is introduced. Historical provider metadata may
be read safely without a provider SDK or processing action; 410 (including
PAYMENT_PROVIDER_RETIRED) routes to manual support, never a replacement invoice.

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
authoritative untuk role code `super_admin`, `cv_specialist`, dan
`resume_service_admin`. Role `resume_service_admin` memiliki seluruh fungsi queue,
assignment, quality review, dan final release. Role lama
`resume_quality_reviewer` telah dipensiunkan dan tidak dipetakan oleh frontend;
backend tetap melakukan authorization setiap operasi.

Upload tidak diretry otomatis. `503 RESUME_SCANNER_UNAVAILABLE`,
`503 RESUME_SCANNER_BUSY`, dan `422 RESUME_FILE_UNSAFE` merupakan kegagalan
upload, bukan sukses. Hanya hasil scanner backend yang current/accepted yang
authoritative; file lama berstatus `CLEAN_SIGNATURE_ONLY` ditandai perlu
upload ulang dan tidak dianggap aman oleh UI.

### Super Admin

The shared workspace is guarded for `super_admin` UX, while the backend remains
authoritative. `services/admin-operations-service.js` owns these transport
operations and uses the shared credentialed API client.

Semua `/admin/data/*` read-only. Frontend tidak menyediakan generic
`POST/PUT/PATCH/DELETE` ke family tersebut; `405 RESOURCE_READ_ONLY`
ditampilkan sebagai arahan memakai endpoint domain. Endpoint operasional
seperti status Feedback tetap aktif sesuai permission backend.

Operational read contracts:

- `GET /admin/statistics` for the command-center counters and Feedback badge.
- `GET /admin/feedback?page&limit&status&search&from&to` for the paginated
  Feedback Inbox. `limit` is at most 100.
- `GET /admin/cards?q={search}` and `GET /admin/cards/{publicId}` for card
  search and detail.
- `GET /admin/reports?days={7|30|90|365}`, `GET /admin/system`, and
  `GET /admin/security` are distinct contracts and must not fall back to a
  shared activity/statistics endpoint.
- Existing users, subscriptions, usage, interventions, settings, mail outbox,
  CV specialists, landing content, email templates, and Resume Services routes
  remain unchanged.

Restricted-sandbox Reports extension (backend `2f24a89`): `paymentTotals` rows
contain provider, environment, currency, status, count and amount. Render each
combination separately. `productionRevenue` rows contain currency, amount and
count and are the ONLY gross-revenue source: currently paid Duitku production
payments by paid_at within the selected period. Never derive production revenue
from paymentTotals, sandbox, unknown/null environment or legacy providers.
`revenueBasis` is explanatory plain text, not accounting authority. Decimal
string amounts are formatted without float conversion/cross-currency summing;
invalid amounts display unavailable, not zero. Missing/empty arrays in old
responses show empty panels. This is not net accounting/profit. Subscription
and operational metrics may include dummy accounts. User-detail payments allow
provider/environment when present; no secret/private fields are added.

Feedback status mutation uses
`PATCH /admin/feedback/{publicId}/status` with
`{ status, reason, confirm: true }`. The reason is 10-1000 characters, the
request uses access-context CSRF, and `409 FEEDBACK_STATUS_UNCHANGED` is a
non-destructive conflict. The frontend does not create or delete feedback.

Card ownership intervention uses
`POST /admin/cards/{publicId}/interventions` with
`CONNECT_MATCHING_VERIFIED_ACCOUNT` or `RELEASE_CARD`, a 10-1000 character
reason, and `confirm: true`. Release copy must explain that the card remains
detached until it is connected again.

All mutations require backend permission, CSRF, explicit confirmation/reason,
recent authentication where required, and immutable audit. A
`403 RECENT_AUTH_REQUIRED` response directs the operator to login again.
The frontend renders only explicit operational fields and never stores admin
responses in Web Storage.

No exact method/path/payload is approved here for plan mutation, admin payment
mutation, theme-catalog mutation, or QR regeneration. Those controls must not be
added until the backend contract and its authorization/audit behavior are
synchronized.

## Confirmed dependency: Super Admin email templates (backend active)

Product direction and Stage 1 specification are approved in FE-D-010. Backend
Stage 2 implemented the contract in source. Migration 010 is applied to the local
main database, the feature flag is active, and the guarded route is reachable.
The contract is consumed by `services/email-template-service.js` and the
Super Admin editor at `/admin/mail/templates/`. Catalog, draft,
preview, dummy test-send/status, publication, versions, and restore operations
are specified once in [Email Template Management](06-EMAIL-TEMPLATE-MANAGEMENT.md).
The confirmed family is `/admin/mail/templates`; the Stage 3 service consumes
all listed operations. Existing outbox/retry operations remain unchanged.

The [backend handoff](EMAIL-TEMPLATES-BACKEND-HANDOFF.md) records the returned
schema/error/authorization/versioning evidence. The adapter and UI use
authenticated super_admin access, access-context
CSRF for unsafe operations, and backend-owned persistence/rendering. Do not
substitute browser storage, guessed endpoints, or mocked success for backend
support. Actual adapter implementation must add behavioral contract tests.

## Contract change procedure

For any endpoint, method, payload, response, role, or CSRF-context change:

1. Update feature service/API client usage.
2. Update this document.
3. Add or update frontend contract tests.
4. Coordinate the corresponding OpenAPI/test change in the backend repository.
5. Verify through staging integration or Postman before production.
