# Super Admin Email Template Management

Date: 2026-09-06

Status: Stages 1-3 complete locally. Backend migration 010 and
`EMAIL_TEMPLATES_ENABLED=true` are active. The authenticated Super Admin editor
is implemented at `/admin/mail/templates/`. Stage 4 automated and anonymous
runtime QA is complete; authenticated workflow and designated-mailbox UAT remain.

## Scope and ownership

Allow Super Admin to edit wording and structured formatting of every existing
user-facing transactional email, starting with the Starter welcome/management
email. Launch language remains Indonesian. This does not introduce a second
welcome email, campaigns, bulk sending, new notification triggers, payment
activation, or a Starter resend/recovery workflow.

Frontend owns menu, forms, accessible preview, state, and API consumption.
Backend owns catalog, persistence, validation, rendering/substitution, SMTP,
authorization, version selection, and audit. Existing mail outbox and retry
controls remain separate from editing templates. No SMTP settings or credentials
are exposed by this feature. Backend work requires its own repository task.

## Verified inventory

Read-only source audit of `C:/xampp/htdocs/krtnmdgtlv2API` on 2026-09-06.
These are code paths, not proof that all workers are running in an environment.

| Email | Key for catalog | Existing trigger and content owner |
|---|---|---|
| Starter welcome / manage card | `starter.management` (confirmed new key) | Direct SMTP after card commit; `src/modules/starter/services/starter-service.ts` |
| Registration verification / resend OTP | `auth.registration-otp` (confirmed new key) | Auth service calls the shared template delivery; reuse one template for first send and resend |
| Password reset | `auth.password-reset` (existing outbox key) | `src/modules/email/password-reset-mail-worker.ts` and SMTP mailer |
| Resume ready | `resume.completed` (existing key) | Release queues subject in `src/modules/resume-service/services/resume-operations-service.ts`; body in resume mail worker |
| Resume retention: 30 days | `resume.retention-30-days` (existing key) | `scripts/resume-worker.ts` queues subject; `src/modules/email/resume-notification-mail-worker.ts` renders body |
| Resume retention: 7 days | `resume.retention-7-days` (existing key) | Same retention producer and mail worker |
| Resume retention: 1 day | `resume.retention-1-days` (existing key; preserve spelling) | Same retention producer and mail worker |

Seven catalog entries across five email purposes. Backend must verify this
inventory against its current branch before implementation and register every
future transactional template in the same catalog. Do not rename existing job
keys or silently treat an unknown `resume.*` key as a retention email.

Current admin routes provide `GET /admin/mail/outbox` and
`POST /admin/mail/outbox/{publicId}/retry`, not template management.
Current frontend ownership: `admin/mail/index.html` and
`pages/admin/super-admin-workspace.js`. Reuse `authService.current()` and the
central API client; do not create another admin authentication or mail transport.

## Editor specification

Implemented navigation: Super Admin > Email, with Outbox at existing `/admin/mail/`
and Template Email at `/admin/mail/templates/`. The latter lists catalog
entries and opens an editor by key without another route per template.

List fields: name, purpose/trigger (read-only), draft revision, published version,
last editor/time. Actions: edit, preview, history. No create arbitrary template,
delete essential email, disable authentication email, or change send schedule.

Editor fields:

- Subject and preheader.
- Welcome heading, greeting, ordered paragraphs, emphasis, CTA labels, footer.
- Optional logo selected from backend-approved brand assets, logo alt text,
  background/text/accent colors, and a fixed single-column layout.
- Variable picker showing only allowed variables and required system blocks.
- Change reason for publish/restore; no raw HTML, CSS, JavaScript, or executable
  template expressions. No arbitrary image URLs, uploads, or CTA destinations.

Controls: Simpan Draft, Pratinjau, Kirim Email Uji, Publikasikan,
Riwayat Versi, and Pulihkan ke Draft. Restoring never publishes immediately.
HTML email and plain-text alternative are generated from one document; users
do not maintain two inconsistent content copies.

States: loading, empty/unavailable catalog, load failure, clean, unsaved, saving,
saved draft, previewing, test queued/sent/failed, publishing, conflict, forbidden,
and expired session. Disable duplicate submissions; preserve unsaved text in
memory on failure, warn before navigation, never persist drafts in Web Storage.
Keyboard labels/focus, live status, Light/Dark, and mobile editor are required.

## Proposed document and variable contract

`content` has `schemaVersion: 1`, `locale: id`, `subject`, `preheader`, `heading`,
`blocks`, `footer`, and `style`. `style` has `logoAssetKey` (nullable), `logoAlt`,
`backgroundColor`, `textColor`, and `accentColor` (six-digit hex colors).

Every block includes a `type` discriminator. Supported block shapes:

- `{ type: paragraph, parts }`: `parts` array of literal `{ text, emphasis }` or variable
  `{ variable, emphasis }` nodes; emphasis is `normal`, `strong`, or `em`.
- `{ type: action, targetVariable, label }`: backend fixes the URL from the event.
- `{ type: system, key }`: backend generates required OTP, expiry, and security text.

`subject`, `preheader`, `heading`, and `footer` are plain text in v1. Personalized
greetings use paragraph variable nodes, not free-form executable interpolation.
Backend catalog returns variable names, types, safe examples, allowed placements,
required block identifiers, asset choices, and limits. Frontend renders these
capabilities; it does not infer variables from recipient records.

| Template family | Allowed dynamic values / required blocks |
|---|---|
| Starter | Optional `fullName`; required actions `cardUrl`, `manageUrl`; required `starterAccessNotice` (24 hours, one use, do not share) |
| OTP | Required `verificationCode` system block including backend expiry and do-not-share notice |
| Password reset | Required action `resetUrl`; required `passwordResetNotice` with backend expiry and unsolicited-request guidance |
| Resume completed | Required action `requestUrl`; required `resumeRetentionNotice` populated from backend retention timestamp |
| Resume retention | Required action `requestUrl`; required `resumeRetentionNotice` with actual deadline and threshold context |

Required blocks can be repositioned but not deleted or duplicated; labels and
surrounding wording are editable. Secret-bearing values may appear only inside
backend-generated system content/actions, never subjects or admin data. Missing
optional name uses a neutral greeting. Missing required event data must never
produce an email with a broken action or misleading deadline.

Proposed limits (backend to confirm): subject 1-160 characters without CR/LF,
preheader 0-200, heading 0-160, footer 0-1000, paragraph text up to 2000 per block,
CTA label 1-80, logo alt 0-160 (required when logo present), at most 30 blocks
and 100 parts per paragraph, entire JSON body at most 64 KiB. Reject unknown
fields, variables, tags, styles, unsafe control characters, and unsupported
versions. Plain paragraph/footer text may contain line breaks; headers may not.
Draft may omit required blocks while editing; preview reports field errors and
publish/test-send reject incomplete or invalid drafts.

## Confirmed backend API operations (feature not active yet)

The Stage 2 backend implementation accepted these paths and shapes. Paths below
are relative to `/api/v1`. All require an authenticated `super_admin`
session; unsafe methods use access-context CSRF and `credentials: include`.
Backend authorization is mandatory on every operation, not just the menu guard.

| Method | Confirmed path | Request / success data |
|---|---|---|
| GET | `/admin/mail/templates` | Catalog items with key, label, purpose, draftRevision, publishedVersion, updatedAt/By |
| GET | `/admin/mail/templates/{key}` | content, draftRevision, publishedVersion, variables, requiredBlocks, assets, limits |
| PUT | `/admin/mail/templates/{key}/draft` | `{ expectedRevision, content }` -> updated draft and revision |
| POST | `/admin/mail/templates/{key}/preview` | `{ draftRevision }` -> resolved dummy document, subject, plainText, warnings; no send |
| POST | `/admin/mail/templates/{key}/test-send` | `{ draftRevision, confirm: true }` -> HTTP 202, `{ testId, status: queued, maskedRecipient }` |
| GET | `/admin/mail/templates/{key}/test-sends/{testId}` | `{ testId, status, maskedRecipient, errorCode }` with queued/sending/sent/failed states |
| POST | `/admin/mail/templates/{key}/publish` | `{ draftRevision, expectedPublishedVersion, reason, confirm: true }` -> publishedVersion, publishedAt |
| GET | `/admin/mail/templates/{key}/versions?limit=20&cursor=...` | `{ items, nextCursor }` with immutable version metadata |
| GET | `/admin/mail/templates/{key}/versions/{version}` | content and version metadata; no recipient data |
| POST | `/admin/mail/templates/{key}/restore` | `{ version, expectedRevision, reason, confirm: true }` -> new draft revision; publication unchanged |

`draftRevision` is an opaque backend concurrency value; `publishedVersion` is a
positive integer or null before first publication. All success data uses the
existing `{ success, message, data }` envelope. Actor IDs and ISO timestamps
come from the backend. Reason length is 10-1000 characters.

Save before preview/test. These operations address an exact revision, never a
mutable 'latest' draft. If edited afterward, invalidate preview/test badges and
require a new preview for the revision selected for publication. Publish dialog
shows template name, revision, and scope: future events only.

Test-send targets only the logged-in Super Admin's verified email, resolved on
the server; no recipient field is accepted. Use dummy identity/OTP and inert
links (no valid signatures or card/auth token issuance), prefix subject `[UJI]`,
and show a visible test banner. A sent status means SMTP accepted, not guaranteed
inbox delivery. Test jobs must not be confused with real customer outbox jobs.

Publish, restore, and test-send require recent authentication, confirmation,
rate limiting, and an `Idempotency-Key` UUID scoped to actor/action/key/payload.
Reuse of a key with different payload returns 409. The current implementation
retains idempotency results without expiry. Frontend uses `skipRefresh: true` for these POSTs,
does not retry automatically, and reconciles uncertain responses by GET before
any explicit retry with the same key. For a timed-out test-send before receipt
of testId, an explicit same-key retry returns the original job without resending.
No persistence of auth secrets or raw email tokens is needed for idempotency.

Error contract: 401 unauthenticated; 403 role/CSRF/recent-auth failure with distinct
codes; 404 unknown template/version/job; 409 revision/publication conflict;
413 payload too large; 422 validation with field paths; 429 rate limit with
Retry-After; 503 template service unavailable. Preserve existing error envelope
and request ID. No overwrite on 409: keep local edits, show latest server state,
and let the user reconcile. No fake save/success if endpoints are missing.

## Rendering, publication, and migration requirements

- The backend renderer is shared by preview, tests, synchronous Starter/OTP,
  and queued reset/Resume delivery. It emits HTML and text from the same model.
- Browser preview receives resolved dummy blocks, uses safe DOM APIs and
  allowlisted styles, and keeps action links inert. No `innerHTML` or arbitrary
  server HTML injection. Exact appearance across mail clients requires mailbox QA.
- Escape variable values in their output context; forbid arbitrary URL schemes,
  template evaluation, remote asset fetching, and user-supplied recipient/header
  overrides. Preview must not load third-party trackers. Brand assets use a
  configured public origin; do not embed localhost URLs into production mail.
- Publishing atomically switches one template version and writes an audit event.
  Drafts do not affect delivery. Restoring copies an old version into a new draft;
  validation and explicit publication apply again. Do not erase historical versions.
- Pin the published version when each new mail event is created; all retries use
  that version. Existing queued jobs must retain their legacy content/version.
  Backend migration must account for hardcoded subjects as well as message bodies.
- Seed defaults from current wording without sending mail. Use a safe built-in
  baseline if no published template exists or its lookup fails; record sanitized
  diagnostics. Never hide SMTP failure or emit unresolved variables. A published
  rollback can recover wording without changing triggers or invalidating tokens.
- Audit records actor, template, action, revision/version, time, request ID,
  reason, and sanitized change metadata. Never store rendered OTPs, reset links,
  Starter tokens, recipient PII, or SMTP secrets in template history/preview/audit.
- Preserve Starter commit-before-mail, strict `emailSent === true`, create
  timeout/no automatic POST retry, case-sensitive slug, one-use 24-hour access
  token, fragment cleanup, and verified-account claim before edit.

## Implemented frontend ownership

- `admin/mail/templates/index.html`: noindex route through the existing admin shell.
- `pages/admin/email-templates.js`: page controller and lifecycle.
- `services/email-template-service.js`: adapter through existing API client.
- `validators/email-template-validator.js`: client feedback, not server authority.
- Existing `pages/admin/super-admin-workspace.js`: add navigation using current
  ownership; do not duplicate its auth or rebuild the whole admin shell.
- `tests/email-template-admin-contract.test.js`: validator, endpoint,
  idempotency, route, and safe-rendering regression coverage.

The editor uses safe DOM rendering, backend-owned preview output, and no Web
Storage. Mail Outbox ownership remains unchanged. No framework/dependency
replacement was made.

## Acceptance and phase gates

1. Stage 1: inventory, initial contract, editor spec, decision, and backend
   handoff documented. No backend mutation, real email, or runtime feature claim.
2. Stage 2: complete. Backend migration/API/rendering is active locally and every
   producer is wired. Mailbox UAT remains separate.
3. Stage 3: complete. The frontend consumes the confirmed contract while
   retaining existing outbox behavior.
4. Stage 4: local automated QA and anonymous runtime routing/API probes complete.
   Authenticated Super Admin mutations and explicit-owner-recipient mailbox UAT
   remain external evidence because no session or recipient was supplied.

Remaining authenticated/mailbox QA: super_admin success and other-role/direct-API
denial; CSRF/recent-auth; draft persistence after reload; draft does not alter
real delivery; exact preview/test version; 409 edits from two tabs; double-click
and timeout without duplicate send; invalid/missing variables and HTML/header
injection rejection; secret-free preview/history; immutable restore/publish;
all seven templates generate HTML+text; queued versions stable across publish;
SMTP failure still returns successful card creation with emailSent false;
Starter link exchange/one-use/expiry/claim unchanged; routing/assets/theme and
keyboard/mobile regression. No real create or email test without a designated
recipient and record/job cleanup or disclosure plan.

The product is complete only when published edits reach actual outbound mail
through the separate backend, not when the frontend form merely renders.
