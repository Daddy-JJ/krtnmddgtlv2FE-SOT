# Changelog

## 2.8.0 — Unified frontend light/dark theme system

- Extended the approved monochrome design language across public information,
  legal, authentication, user workspace, and admin workspace shells.
- Added an accessible first-visit Light/Dark chooser and persistent theme
  toggle using one non-sensitive browser preference key.
- Added solid monochrome panels, proportional typography, restrained
  code-native graphics, and reduced-motion-aware transitions.
- Kept public user card artwork independent so its owner-selected card theme is
  never overridden by the website chrome preference.
- Added full-shell theme coverage and safe-storage contract tests.

## 2.7.0 — Monochrome landing and article refinement

- Reworked the landing page into the approved bright monochrome, mobile-first
  visual system with ten ordered content sections.
- Added code-native responsive product, QR-placeholder, profile, security, and
  CTA illustrations without raster UI screenshots.
- Added accessible mobile navigation, reduced-motion support, and stronger
  keyboard focus behavior.
- Added the indexable article
  `/blog/satu-link-untuk-identitas-profesional/` with BlogPosting structured
  data and sitemap coverage.
- Preserved the existing static frontend stack, backend contracts, membership
  rules, and annual Basic/Pro subscription wording.

## 2.0.0 — Consolidated SSOT

- Menggabungkan semua keputusan proyek ke satu repository.
- Menetapkan Starter, Basic, Pro.
- Menambahkan Organization dan Role/Jabatan sebagai core identity.
- Menetapkan mapping vCard/VCF.
- Menyelesaikan modular monolith architecture.
- Menambahkan secure Starter Manage Token flow.
- Menambahkan ERD, database dictionary, SQL reference, OpenAPI.
- Menambahkan Midtrans webhook verification/idempotency.
- Menambahkan frontend component catalog, test strategy, UAT.
- Menambahkan file index dan checksum manifest.

## 2.1.0 — Self-hosted QR rendering

- QR menjadi backend rendering service.
- Default adapter menggunakan `endroid/qr-code`.
- External QR API tidak digunakan.
- QR dan vCard dipisahkan.
- Frontend, UI/UX, admin, backend, security, API, tests, deployment, dan struktur diperbarui.
- QR tetap derived artifact; tidak ada tabel QR baru.

## 2.2.0 — Public URL and slug rules

- Starter public URL moved to root path with case-sensitive random code.
- Starter random code contains lowercase and uppercase letters.
- Basic and Pro receive an editable custom URL field in card/user settings.
- Basic and Pro receive a default slug suggestion based on two first-name letters plus normalized mobile number.
- Added slug availability, validation, reserved words, collision handling, preview, and privacy warning.
- Updated frontend, UI/UX, backend, database notes, API contract, security, tests, and project structure.

## 2.3.0 — Midtrans membership upgrade
- Added Midtrans Snap gateway abstraction.
- Added checkout, webhook verification, idempotency, reconciliation, and subscription activation.
- Added billing UX, admin payment operations, OpenAPI, security, tests, and deployment notes.
- Historical payment foundation; its one-time/manual-renewal product wording is
  superseded by CR-005 and D-049.

## 2.6.0 — Annual subscription alignment

- Corrected Basic and Pro to annual subscriptions with a fixed 365-day term.
- Locked annual duration in seed, migration, checkout, admin validation,
  OpenAPI, frontend wording, and QA contracts.
- Kept activation and renewal authoritative to verified server-side payment
  evidence while provider-specific automated collection remains paused.

## 2.4.0 — Card themes and editable field contract

- Added ten approved card themes and preview assets.
- Added seven landscape and three Pro portrait templates.
- Added cumulative Starter/Basic/Pro theme access.
- Added shared safe frontend renderer.
- Added theme registry, CSS, database seeds, APIs, backend Theme module, user editor, admin controls, and tests.
- Confirmed that all themes use the same vCard-compatible normalized contact fields.

## 2.5.0 — Official cPanel SMTP email
- Added official-domain SMTP architecture.
- Added registration OTP, resend, expiry, attempt limits, hashing, templates, outbox, retry, admin mail operations, DNS deliverability checklist, API, tests, and Codex prompt.

## 2.5.1 — Pre-implementation SOT reconciliation
- Reconciled root public URLs and removed legacy `/c/{slug}` guidance.
- Standardized descriptive immutable theme codes and physical `cards.theme_id` mapping.
- Removed the legacy email-verification token endpoint/table in favor of registration OTP.
- Defined session-bound CSRF transport for cookie-authenticated mutations.
- Separated `canonicalUrl` from `qrImageUrl`.
- Kept OTP plaintext out of durable outbox storage; non-OTP mail retains queue/retry.

### Phase 1 foundation implementation — 2026-07-18
- Added the PHP 8.2 bootstrap, PSR-4/fallback autoloading, configuration validation, PDO factory, HTTP kernel/router, JSON error envelopes, request IDs, structured logs, and Apache front controller.
- Added `GET /api/v1/health` with database readiness and safe `503` behavior.
- Added migration/rollback/status and idempotent seed CLIs.
- Added the reconciled 19-table schema, three locked plans, 33 capability rows, ten themes, and cumulative 1/3/10 theme access.
- Added native unit/integration tests and verified them against isolated MariaDB 10.4.28.

### Backend/API readiness and QA preparation — 2026-07-18
- Audited PHP, MariaDB, Node.js/Express, REST CRUD, frontend contract, and Postman readiness.
- Added a distinct OpenAPI refresh-cookie scheme and restricted Starter create/update input contract.
- Added a curated Postman collection/environment with no stored credentials.
- Added phase-based QA gates and a security execution checklist.
- Paused Phase 2 implementation pending the PHP-versus-Express architecture decision.

### Phase 1M Node.js/Express migration — 2026-07-18
- Approved CR-002 and made Node.js 24 LTS, Express 5, strict TypeScript, and MySQL2 the active backend baseline.
- Added environment validation, secure Express bootstrap, request IDs, structured redacted logging, health/readiness, graceful shutdown, and cPanel Passenger bridge.
- Ported migration/checksum/rollback/status and idempotent seed execution to Node while preserving the authoritative SQL schema.
- Added an exact npm dependency manifest and integrity lockfile; dependency audit reported zero known vulnerabilities.
- Passed strict typecheck, eight active unit/HTTP tests, and the isolated MariaDB migration/seed integration test.
- Kept the historical PHP files temporarily for owner-reviewed parity acceptance; Phase 2 remains paused.
- Product owner accepted Phase 1M; removed the PHP/Composer runtime, Apache entrypoint, legacy scaffolds, and PHP test harness while preserving authoritative SQL and reusable mail templates.
- Re-ran Node typecheck and HTTP/unit regression after cleanup; Phase 2 was not started.

### Phase 2A Auth security foundation — 2026-07-18
- Added native asynchronous Argon2id password hashing with salted PHC-style storage and constant-time verification.
- Added RS256 short-lived access tokens, 256-bit opaque credential generation with hash-only persistence values, and signed session-bound CSRF tokens.
- Added centralized Secure/HttpOnly/SameSite cookie policy, with a readable non-authentication CSRF cookie boundary.
- Added strict Auth and Starter DTO schemas that reject unknown paid fields, normalize email, and allow only HTTP(S) website URLs.
- Added Node 24.7 runtime floor for native Argon2 support and passed 15 active unit/security/HTTP tests.

### Phase 2B Auth/OTP API — 2026-07-18
- Implemented register, email OTP verify/resend, login, refresh rotation, family revocation on reuse, logout, forgot password, and reset password routes.
- Added MySQL2 repository transactions, hash-only credential persistence, and database-backed hashed fixed-window rate limiting.
- Added Nodemailer SMTP adapter, production HTTPS/cookie/SMTP configuration gates, and one-time JWT key generation script.
- Added secret-safe password-reset outbox worker: tokens are generated only at dispatch and never stored in outbox payloads.
- Passed 20 active unit/security/HTTP tests, full MariaDB Auth lifecycle integration, OpenAPI validation, and dependency audit with zero known vulnerabilities.

### Phase 2C Starter workflow — 2026-07-18
- Implemented anonymous Starter creation with seven-letter CSPRNG mixed-case slug and database-authoritative `starter-clean` theme access.
- Added 256-bit hash-only manage credentials, signed manage-bound CSRF, per-edit transactional credential rotation, and old-token rejection.
- Implemented verified-account claim with access + manage credentials, one-card enforcement, and revocation of every Starter manage token.
- Added HTTP/security and MariaDB lifecycle tests covering client slug/theme injection, case-sensitive slug rules, rotation, claim, conflict, and plaintext-token absence.
- Product owner accepted Phase 2C and closed Phase 2; Phase 3 remains unstarted pending separate approval.

### Phase 3A Card Core foundation — 2026-07-18
- Locked D-040: authenticated card creation requires an active server-side Basic/Pro subscription and never creates an owned Starter card.
- Started reusable actor authorization and plan capability foundations for Card Core.

### Phase 3B Card CRUD — 2026-07-18
- Added authenticated Card list/create/get/update/soft-delete routes with reusable actor and CSRF enforcement.
- Added transactional paid entitlement, verified-user, one-card, default-theme, and collision-safe provisional slug persistence.
- Added strict Card DTO rejection for plan, slug, theme, logo, Maps, and paid-feature injection.
- Added migration 003 to enforce one non-deleted card per account while retaining soft-deleted history; full MariaDB lifecycle passed.

### Phase 3C Slug/theme — 2026-07-18
- Added reserved-root-safe custom slug normalization, phone-based suggestion privacy metadata, alternatives, availability, and Basic/Pro mutation enforcement.
- Added active theme catalog/access flags and ownership-scoped theme selection through explicit `plan_theme_access` authority.
- Dedicated HTTP tests and full MariaDB slug/theme lifecycle passed; publish/public work remains pending.
- Added ownership/CSRF-protected publish and anonymous published-card read; draft, deleted, inactive-theme, and cross-owner resources remain hidden.

### Phase 4A VCF 3.0 — 2026-07-19
- Added published-card-only VCF 3.0 download with UTF-8 CRLF output, safe escaping, injection prevention, 75-octet folding, and safe attachment filename.
- Kept VCF independent from themes, QR, logo, social, catalog, and other web-only fields.
- Dedicated formatter/HTTP tests and full regression passed.

### Phase 4B QR PNG — 2026-07-19
- Installed exact `qrcode` runtime dependency behind `QrCodeRendererPort` and test-only PNG/QR decoders.
- Added published-card-only 512px PNG rendering, canonical URL payload, content-addressed filesystem cache, ETag/304, inline/download, and database-backed rate limiting.
- Generated PNG decoded to the exact canonical URL; cache miss/hit/invalidation, headers, and regression gates passed with zero audit vulnerabilities.

### Phase 4C Social/catalog foundation — 2026-07-19
- Added ownership/CSRF-scoped social and catalog CRUD with strict URL/plain-text DTOs and deterministic sorting.
- Added transactional card locking and authoritative `social_link_limit` / `catalog_item_limit` enforcement for Starter, Basic, and Pro.
- Dedicated HTTP tests and full MariaDB Basic/Pro limit, sorting, ownership, update/delete, and slot-reuse lifecycle passed.

### Phase 4D Logo/Maps/WhatsApp/public aggregate — 2026-07-19
- Activated nullable HTTP(S) Maps input behind the `maps_enabled` capability and persisted it through prepared Card queries.
- Added read-only Pro WhatsApp CTA derivation from normalized mobile phone data.
- Added Pro-only multipart logo upload with CSRF, a 5 MiB transport limit, actual image decoding, dimension limits, WebP normalization, opaque filenames, safe replacement, and public ETag caching.
- Added public social/catalog aggregation with current-plan limits, deterministic sorting, and unpublished catalog filtering.
- Updated OpenAPI and passed 57 active unit/security/HTTP tests, the disposable MariaDB lifecycle, strict typecheck, YAML parsing, and a zero-vulnerability dependency audit.
- Product owner accepted Phase 4D and closed Phase 4 on 2026-07-19; Phase 5 remains unstarted.

### Phase 5A Payment gateway/security foundation — 2026-07-19
- Installed exact `midtrans-client` 1.4.3 behind `PaymentGatewayPort`; no SDK dependency leaks into controllers or services.
- Added strict Basic/Pro checkout input and tolerant-but-bounded notification validation.
- Added classic Midtrans SHA-512 verification with constant-time comparison, sanitized notification output, deterministic event keys, and guarded status reconciliation input.
- Added opt-in environment validation that fails closed when Midtrans credentials or callback URLs are incomplete, without including secret values in errors.
- Audited existing payment/subscription/event schema and confirmed no Phase 5A migration is required.
- Passed strict typecheck, 61 active tests, and dependency audit with zero known vulnerabilities; Phase 5B persistence and HTTP routes remain unstarted.
- Product owner accepted Phase 5A on 2026-07-19.

### Phase 5B Checkout persistence and payment history — 2026-07-19
- Added authenticated, CSRF-protected Basic/Pro checkout and ownership-scoped payment list/detail APIs.
- Checkout reads verified user, claimed card, active plan, price, currency, duration, and current subscription from authoritative database state.
- Pending payment and immutable commercial snapshot are persisted before the Snap request; gateway failure is recorded as failed without activating membership.
- Added unique server-generated order IDs, downgrade prevention, unpriced-plan rejection, disabled-gateway `503`, and non-enumerating payment ownership responses.
- Added precise OpenAPI payment schemas and Postman checkout/history requests.
- Passed 66 active unit/security/HTTP tests and disposable MariaDB lifecycle covering snapshot immutability and ownership isolation.
- Product owner accepted Phase 5B on 2026-07-19.

### Phase 5C Verified webhook and subscription activation — 2026-07-19
- Added the public server-to-server Midtrans webhook route; browser callbacks remain informational and cannot activate membership.
- Added verified-notification processing with unique event keys, payload hashes, duplicate acknowledgement, conflict detection, amount matching, and non-regressive state handling.
- Added one-transaction successful settlement/capture handling across payment, event, subscription, card plan snapshot, and sanitized activity log.
- Added same-plan renewal extension from the later active end date and upgrade replacement of the prior active subscription.
- Added rejected amount-mismatch event persistence without payment or subscription activation.
- Updated OpenAPI and Postman negative-signature coverage; passed 69 active unit/security/HTTP tests and the final disposable MariaDB lifecycle.
- Product owner accepted Phase 5C on 2026-07-19.

### Phase 5D Reconciliation, subscription, and minimal admin — 2026-07-19
- Added ownership-first, CSRF-protected payment reconciliation using server-authenticated Midtrans Get Status.
- Added current active subscription read API.
- Added admin-role-only plan, payment, user, card, theme, and activity views with bounded result sets.
- Added audited Basic/Pro commercial plan updates and locked theme activation/order updates; Starter, tier definitions, capabilities, gateway facts, and manual paid status remain immutable.
- Passed 72 active unit/security/HTTP tests and final disposable MariaDB coverage for subscription/admin queries and audit writes.
- Product owner accepted Phase 5D and closed Phase 5 on 2026-07-19.

### Phase 6A frontend foundation — 2026-07-19

- Added a mobile-first semantic public shell with keyboard focus, skip navigation, reduced-motion handling, and Indonesian/English locale resources.
- Added a configurable Fetch API client using cookie credentials, request IDs, timeouts, separate access/Starter CSRF contexts, normalized backend errors, and one controlled session refresh.
- Added automated frontend security, cookie, API client, i18n, and accessibility-smoke tests without introducing auth-token browser storage.
- Phase 6A was accepted by the product owner; auth, editor, billing, admin, deployment, commit, and push remained outside this phase.
- Final Phase 3C HTTP regression and MariaDB publish/public lifecycle passed.

### Phase 6B Auth and Starter onboarding UI — 2026-07-19

- Added static Vanilla JS pages for register, email OTP verification/resend, login, forgot password, reset password, anonymous Starter creation, and Starter manage/claim.
- Added frontend auth and Starter services mapped to the existing REST contract, with public POST calls explicitly opting out of CSRF and cookie-auth mutations selecting access or Starter CSRF context.
- Added client-side validators and shared form utilities for accessible errors, busy state, API field-error mapping, OTP numeric input, and safe status messages.
- Kept auth tokens and Starter manage credentials out of browser storage and JavaScript-visible state; Starter manage continues to rely on backend HttpOnly cookies.
- Frontend automated suite passed 17 tests covering API CSRF contract, validators, i18n, cookies, and static security scanning.
- Product owner accepted Phase 6B on 2026-07-19; Phase 6C remains unstarted pending explicit approval.

### Phase 6C Dashboard shell and app navigation — 2026-07-19

- Added authenticated dashboard shell at `/app/` with mobile-first app navigation, overview status, card summary, subscription summary, quick actions, and logout.
- Dashboard uses existing cookie-authenticated `GET /cards` and `GET /subscriptions/current` endpoints as the session/data gate; no new backend API contract was introduced.
- Added dashboard frontend service and page lifecycle using local state, `auth:expired` redirect behavior, safe text rendering, and no browser token storage.
- Fixed API client envelope handling so successful responses with `data: null` return `null` instead of the raw envelope.
- Frontend automated suite passed 18 tests covering the dashboard API contract, CSRF boundaries, validators, i18n, cookies, and static security scanning.
- Product owner accepted Phase 6C on 2026-07-19; Phase 6D remains unstarted pending explicit approval.

### Phase 6D Card identity/contact editor — 2026-07-19

- Added authenticated identity and contact editor pages under `/app/card/identity/` and `/app/card/contact/`.
- Added Card REST service bindings for list/get/update and access-CSRF protected `PUT /cards/{publicId}`.
- Added card editor validator that merges updates into the latest complete contact payload, preserving fields outside the active page section.
- Kept Maps, slug, theme, publish, social, catalog, billing, admin, deployment, commit, and push outside Phase 6D.
- Frontend automated suite passed 20 tests covering card update CSRF, payload preservation, validators, dashboard contract, and static security scanning.
- Product owner accepted Phase 6D on 2026-07-19; Phase 6E remains unstarted pending explicit approval.

### Phase 6E Card settings, slug, publish, and QR panel — 2026-07-19

- Added card settings page at `/app/card/settings/` for current public URL, Basic/Pro custom slug, publish action, and QR panel.
- Added slug validator for lowercase letters, digits, hyphen, length, and reserved-root blocking.
- Added frontend Card service bindings for slug suggestion, slug availability, slug update, and publish using existing REST endpoints.
- Kept Starter slug read-only and Basic/Pro slug mutations access-CSRF protected.
- QR panel uses backend `qrImageUrl` only and download appends `download=true`; it does not encode token, raw contact data, or third-party QR service payloads.
- Frontend automated suite passed 22 tests covering slug CSRF boundaries, slug validation, card editor, dashboard, cookies, i18n, and static security scanning.
- Product owner accepted Phase 6E on 2026-07-19; Phase 6F remains unstarted pending explicit approval.

### Phase 6F Theme picker and design panel — 2026-07-19

- Added design page at `/app/card/design/` with theme gallery, orientation filter, preview image, locked/available state, and save action.
- Added frontend Card service bindings for card theme list and theme update using existing REST endpoints.
- Added theme validator for the locked ten-theme catalog and orientation filtering.
- Theme list uses safe authenticated `GET`; theme update uses access-CSRF protected `PATCH /cards/{publicId}/theme`.
- Kept full live template rendering, unsaved field preview, social/catalog, billing, admin, deployment, commit, and push outside Phase 6F.
- Frontend automated suite passed 24 tests covering theme CSRF boundaries, theme validation/filtering, slug/settings, card editor, dashboard, cookies, i18n, and static security scanning.
- Product owner accepted Phase 6F on 2026-07-19; Phase 6G remains unstarted pending explicit approval.

### Phase 6G Social and catalog editor — 2026-07-19

- Added social link editor at `/app/card/social/` with list, create, delete, platform selection, URL, and sort order fields.
- Added catalog item editor at `/app/card/catalog/` with list, create, delete, title, description, target URL, sort order, and published toggle.
- Added frontend content service bindings for social/catalog list, create, and delete using existing REST endpoints.
- Added social/catalog validators matching backend-facing platform, HTTP(S) URL, title, and sort-order constraints.
- Reads use safe authenticated `GET`; mutations use access-CSRF protected POST/DELETE requests.
- Kept update forms, drag sorting, media uploads, billing, admin, deployment, commit, and push outside Phase 6G.
- Frontend automated suite passed 26 tests covering social/catalog CSRF boundaries, validators, theme, slug/settings, card editor, dashboard, cookies, i18n, and static security scanning.
- Product owner accepted Phase 6G on 2026-07-19; Phase 6H remains unstarted pending explicit approval.

### Phase 6H Billing and payment UI — 2026-07-19

- Added billing page at `/app/billing/` with current subscription summary, Basic/Pro checkout actions, payment history, continue-payment links, and backend status refresh.
- Added frontend payment service bindings for current subscription, payment list, checkout, and reconciliation using existing REST endpoints.
- Added payment validator for locked Basic/Pro checkout choices and billing status labels.
- Billing reads use safe authenticated `GET`; checkout and reconciliation use access-CSRF protected POST requests.
- Browser payment redirects are treated as UI signals only; membership remains locked until backend reports an active subscription.
- Frontend automated suite passed 28 tests covering billing CSRF boundaries, payment validator, social/catalog, theme, slug/settings, card editor, dashboard, cookies, i18n, and static security scanning.
- Product owner accepted Phase 6H on 2026-07-19; Phase 6I remains unstarted pending explicit approval.

### Phase 6I Account security UI — 2026-07-19

- Added account page at `/app/account/` with email OTP verification, resend OTP, password reset request, and logout.
- Reused existing Auth REST endpoints only: verify OTP, resend OTP, forgot password, and logout.
- Kept `/me` profile read/update out of Phase 6I because the OpenAPI path exists but no backend router/controller is currently mounted for it.
- OTP input uses numeric input mode and one-time-code autocomplete; resend applies a client-side cooldown.
- Logout remains access-CSRF protected; public email/OTP/reset requests explicitly opt out of CSRF.
- Frontend automated suite passed 30 tests covering account Auth boundaries, validators, billing, social/catalog, theme, slug/settings, card editor, dashboard, cookies, i18n, and static security scanning.
- Product owner accepted Phase 6I on 2026-07-19; Phase 6QA started next per explicit approval.

### Phase 6QA Integrated frontend QA/security pass — 2026-07-19

- Executed integrated QA/security gate across frontend tests, backend contract health, OpenAPI parsing, Postman collection parsing, dependency audit, and static frontend security sink scan.
- Frontend automated suite passed 30 tests with 0 failures.
- Backend TypeScript check passed.
- Backend regression suite passed 72 tests with 0 failures and 1 intentionally skipped MariaDB integration test under default non-DB mode.
- Backend dependency audit passed with 0 vulnerabilities at moderate threshold.
- OpenAPI YAML and Postman JSON both parsed successfully.
- Static scan found no runtime `localStorage`, `sessionStorage`, `innerHTML`, `outerHTML`, `document.write`, or `eval` usage under frontend source.
- Logged Medium finding `6QA-MED-001`: OpenAPI documents `/me`, but backend has no mounted `/me` route/controller yet; Phase 6I correctly avoided depending on that drift.
- No Critical/High findings remain open from the automated QA/security pass.
- Product owner accepted Phase 6QA on 2026-07-19; Phase 7 or API contract-cleanup work remains unstarted pending explicit approval.

### API contract cleanup `/me` — 2026-07-19

- Implemented the documented `GET /api/v1/me` and `PUT /api/v1/me` backend contract through a dedicated account module.
- Added thin account controller, service-layer account rules, and MySQL repository with prepared statements.
- `GET /me` requires the authenticated access cookie and returns the current account profile.
- `PUT /me` requires authenticated access cookie plus session-bound `X-CSRF-Token`, validates a strict email-only body, rejects duplicate email with `409 EMAIL_ALREADY_REGISTERED`, and resets `emailVerified` when the email changes.
- Updated OpenAPI `/me` responses from generic success envelopes to `AccountEnvelope`.
- Added Postman coverage for current user and update-current-user email contract.
- Added backend HTTP regression coverage for `/me`; backend suite passed 75 tests with 0 failures and 1 skipped MariaDB integration test under default non-DB mode.
- Closes Medium finding `6QA-MED-001`.
- Product owner accepted `/me` API contract cleanup on 2026-07-19; Phase 7 remains unstarted pending explicit approval.

### Phase 7A Release readiness package — 2026-07-19

- Started Phase 7 with a bounded release-readiness package instead of production deployment.
- Updated repository, backend, QA, and deployment documentation to reflect accepted Phase 6QA and `/me` API cleanup status.
- Expanded the deployment runbook into explicit pre-deploy, automated release checks, manual smoke/UAT, cPanel, rollback, Midtrans, and SMTP gates.
- Automated Phase 7A release checks passed: backend typecheck, backend regression suite, backend dependency audit, frontend tests, OpenAPI parse, Postman parse, and manifest checksum.
- Production deployment, live SMTP, live Midtrans, browser/device UAT, backup restore execution, commit, and push remain outside Phase 7A until explicitly approved and configured.
- Product owner accepted Phase 7A on 2026-07-19.

### Phase 7B Manual UAT/environment readiness gate — 2026-07-19

- Started Phase 7B as a manual UAT and environment-readiness evidence gate.
- Corrected stale status notes for QR, Public URL, Midtrans, and theme readiness so release/UAT planning reflects accepted implementation phases.
- Expanded the UAT checklist with environment readiness, browser/device matrix, release sign-off, and evidence hygiene rules.
- Added a sanitized UAT evidence log template under `qa/UAT-EVIDENCE-LOG.md`.
- Prepared the selected Vercel frontend preview + backend local/staging path with a same-origin Vercel rewrite scaffold, frontend runtime API config, and backend credentialed CORS allowlist fallback.
- Production deployment, live credentials, external service execution, commit, and push remain outside Phase 7B until explicitly approved.
- Product owner accepted Phase 7B on 2026-07-19.

### Phase 7C Vercel preview preflight — 2026-07-19

- Started actual Vercel preview preparation for the selected Vercel frontend preview + backend local/staging path.
- Added Vercel schema metadata to `frontend/vercel.json`.
- Added `backend/.env.staging.example` with safe placeholders for staging/tunnel configuration.
- Recorded preflight blockers: backend rewrite destination is still a placeholder, Vercel CLI is not available on the workspace shell, and no `.vercel/` project link exists.
- Selected HTTPS tunnel for backend local and recorded the additional blockers: no tunnel tool on `PATH`, no local `.env`, and no generated local JWT keys.
- Started an isolated temporary MariaDB staging database, ran backend migrations/seeders, started the backend locally, and exposed it through Cloudflare Tunnel.
- Updated `frontend/vercel.json` to rewrite `/api/v1/*` to a temporary backend tunnel placeholder; the active tunnel URL was sanitized before Git push.
- Verified tunnel health returned 200 with staging environment and available database.
- Initial CLI deployment created a Vercel project deployment reported as `target: production`; no custom domain was attached and it remains protected by Vercel SSO.
- Authenticated Vercel CLI through device login and deployed explicit preview `https://frontend-6m31framt-phoenikz-s-projects.vercel.app`.
- Vercel inspect reports the preview deployment is Ready, but public UAT is blocked because Vercel redirects both `/` and `/api/v1/health` to SSO protection.
- Deployed a second explicit protected preview `https://frontend-3hzgksgvo-phoenikz-s-projects.vercel.app` with `trailingSlash: false` for API rewrite correctness.
- Verified protected preview smoke via `vercel curl`: `/` returned `200` and `/api/v1/health` returned backend `200` with staging database available.
- Sanitized the temporary Cloudflare Tunnel URL from tracked config again after deployment.
- No production promotion, custom-domain deployment, live credential use, commit, or push was performed.

### Phase 7E Public preview access unblock — 2026-07-19

- Disabled Vercel SSO Deployment Protection for project `phoenikz-s-projects/frontend` to unblock public browser UAT.
- Confirmed project protection readback reports `ssoProtection: null`.
- Verified public preview root `https://frontend-3hzgksgvo-phoenikz-s-projects.vercel.app` returns `200` without Vercel CLI bypass.
- Verified public preview `/api/v1/health` returns backend `200` through the Vercel rewrite and Cloudflare Tunnel, with staging database available.
- Git fork protection and automation bypass metadata remain present in Vercel project settings.
- No production promotion, custom-domain deployment, live credential use, commit, or push was performed.
- Product owner accepted Phase 7E on 2026-07-19.

### Phase 7F Browser/device UAT — 2026-07-19

- Started browser/device UAT for the active Vercel preview + backend local/staging tunnel path.
- Verified public preview root returns `HTTP/2 200` without Vercel CLI bypass.
- Verified `/login` and `/app` route smoke checks return `HTTP/2 200`.
- Verified `/api/v1/health` returns backend `HTTP/2 200` through the Vercel rewrite, with `environment: staging` and `database: available`.
- Confirmed security response headers are present in preview/API smoke responses, including `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, and HTTPS HSTS.
- Found and fixed `/api/v1/plans` route drift: OpenAPI already defined the public endpoint, but backend did not mount it.
- Added a read-only public plans catalog route backed by parameterized MySQL queries.
- Verified `/api/v1/plans` through the Vercel preview rewrite returns `HTTP/2 200` with Starter, Basic, and Pro.
- Verified protected `/api/v1/themes` and `/api/v1/me` still return `401` without session cookies.
- Found and fixed Starter public delivery drift: newly created Starter cards were saved as `draft`, and the public-card query required a user join, causing anonymous Starter public card, QR, and VCF endpoints to return `404`.
- Updated Starter creation to publish the anonymous Starter card immediately, as required by the public Starter flow.
- Updated public card lookup to support anonymous Starter cards and preserve case-sensitive slug matching.
- Verified Starter create/read/update smoke on local staging: create `201`, public card `200`, QR PNG `200`, VCF `200`, missing-CSRF update `403`, CSRF update `200`, and canonical URL uses the Vercel preview origin.
- Android/iPhone QR scan, Safari/Chrome interactive flows, Midtrans sandbox, live SMTP inbox checks, and backup/restore rehearsal remain manual UAT items.
- No production promotion, custom-domain deployment, live credential use, commit, or push was performed.

### Phase 7G UAT runtime stabilization — 2026-07-19

- Started UAT runtime stabilization after the Phase 7F checkpoint commit.
- Recorded the current runtime blocker: Vercel preview remains usable, but backend local/staging + temporary Cloudflare Tunnel is not reliable enough for long browser/device UAT after the one-shot Starter smoke.
- Confirmed the next reliable UAT path should use either a stable backend staging host or a freshly started backend+tunnel session with exact preview `APP_URL`.
- Started fresh temporary MariaDB staging database, ran migrations and seeders, started backend staging on port 3000, and exposed it through a fresh Cloudflare Tunnel.
- Deployed fresh Vercel preview `https://frontend-ifqw75s1v-phoenikz-s-projects.vercel.app` with runtime rewrite to the fresh backend tunnel, then sanitized local `frontend/vercel.json` back to the placeholder rewrite target.
- Verified preview root, `/api/v1/health`, `/api/v1/plans`, and Starter create/public/QR smoke through the fresh preview.
- Restarted backend with `APP_URL` set to the fresh preview URL and verified new Starter canonical URLs use the fresh preview origin.
- Kept active tunnel URLs, local cookies, JWT keys, and runtime cache artifacts out of tracked files.
- No production promotion, custom-domain deployment, live credential use, or push was performed.

### Phase 7H Manual browser/device UAT runbook — 2026-07-19

- Added a manual UAT runbook for the fresh Vercel preview + local/staging backend tunnel path.
- Defined the browser/device matrix for public preview, Starter URL/QR, auth, dashboard/card editor, theme/social/catalog, billing, email, and security smoke checks.
- Added evidence hygiene rules to prevent passwords, OTPs, cookies, manage tokens, active tunnel domains, and service credentials from being stored in repository files.
- Updated the UAT evidence log to use the fresh preview URL and added a pending Phase 7H manual-runbook evidence row.
- Refreshed the temporary tunnel/preview path after a quick tunnel hostname DNS failure and verified preview root, health, plans, public dummy cards, and dummy admin/Starter/Basic/Pro login checks.
- Production promotion, custom-domain deployment, stable backend hosting, live SMTP, live Midtrans, and manual product-owner execution remain pending.

### Phase 7I Vercel Git integration hardening — 2026-07-19

- Confirmed `frontend/index.html` should remain inside the `frontend/` root directory instead of being moved to repository root.
- Confirmed the active Vercel Git project `krtnmdgtlv2` uses Root Directory `frontend`.
- Updated Vercel project settings to use static frontend deployment values: `npm install`, `npm run vercel-build`, and output directory `.`.
- Added no-op `build` and `vercel-build` scripts to `frontend/package.json` so Git deploys remain resilient when Vercel runs a build command.
- Kept `frontend/vercel.json` sanitized with a placeholder backend rewrite target; temporary tunnel origins remain deployment-time only.

### Phase 7J–7N release gate audit — 2026-07-19

- Disabled Vercel SSO Deployment Protection for Git-connected project `krtnmdgtlv2`; public static root and login routes returned `200`.
- Confirmed Git-connected static frontend is public, with root directory `frontend`.
- Confirmed API health on the Git-connected domain still returns `502 DNS_HOSTNAME_NOT_FOUND` because no stable backend origin is configured.
- Marked Phase 7K stable backend staging as blocked and Phase 7L end-to-end UAT as blocked by Phase 7K.
- Ran Phase 7M local automated checks: backend typecheck passed, backend tests passed 77/1 skipped, backend audit found 0 vulnerabilities, frontend tests passed 30/30, frontend audit found 0 vulnerabilities, OpenAPI/Postman parsing passed.
- Added `frontend/package-lock.json` for deterministic frontend install/audit behavior.
- Reached Phase 7N decision: static frontend preview is approved, but full production is no-go until stable backend, database, UAT, Midtrans, SMTP, backup, and rollback gates are complete.

### Phase 8A stable backend staging provisioning package — 2026-07-19

- Prepared a stable backend staging provisioning package to unblock Phase 7K.
- Added non-secret production/staging environment template for backend runtime configuration.
- Added VPS systemd and Nginx reverse proxy example templates.
- Expanded the deployment runbook with stable backend staging steps and quick-tunnel limitations.
- No live backend, DNS, custom domain, database, SMTP, Midtrans, or production deployment was performed.

### Phase 8B backend staging deployment runbook — 2026-07-22

- Added a backend staging infrastructure intake checklist.
- Added an executable backend staging deployment runbook covering VPS, cPanel Passenger, database migration/seed, Vercel rewrite handoff, smoke tests, rollback, and evidence hygiene.
- Confirmed deployment remains blocked until a real hosting target, DNS, database, and server-side secret configuration are available.

### Phase 8C shared hosting compatibility assessment — 2026-07-22

- Assessed the provided shared hosting facts: MariaDB `11.4.8-MariaDB-cll-lve`, local UNIX socket database access, cPanel `cpsrvd`, PHP `8.4.22`, and PHP extensions.
- Confirmed MariaDB is likely usable only after explicit `utf8mb4` database/table configuration.
- Marked shared hosting backend deployment blocked because Node.js `>=24.7 <25` and cPanel Passenger/Application Manager support were not confirmed.
- Preserved the accepted Node.js + Express backend architecture; no PHP backend fallback was introduced.

### Phase 8D shared hosting Node.js readiness checklist — 2026-07-22

- Updated shared hosting assessment after the product owner confirmed SSH access and Node.js availability.
- Reclassified shared hosting from blocked/unknown to conditional candidate pending exact Node.js version and cPanel Node.js Application Manager/Passenger details.
- Added SSH and cPanel verification commands/checklist, while preserving the Node.js `>=24.7 <25` backend requirement.
- Confirmed Redis/Object Cache and WordPress accelerators are not part of the locked MVP backend and should not add new runtime dependencies now.

### Phase 8E shared hosting deployment dry-run — 2026-07-22

- Corrected the hosting evidence to record Node.js 22 as the currently available runtime, which does not meet the locked backend floor.
- Recorded the product-owner-authorized Node.js 24 assumption for planning while provider activation remains pending.
- Added the cPanel application mapping, environment/database/storage plan, ordered install and Passenger startup gates, smoke checks, worker capability check, shared-hosting frontend handoff, rollback boundary, and sanitized evidence requirements.
- Corrected staging/production `APP_URL` templates to use the project frontend origins for canonical card and user-facing links; the Midtrans webhook remains on the backend HTTPS origin.
- Retired the active Vercel deployment path after the product owner cancelled Vercel for frontend checking: removed `frontend/vercel.json`, local `.vercel` link metadata, and the `vercel-build` script.
- Replaced active Vercel-specific UAT, environment, CORS-test fixture, and Phase 8 handoff instructions with deployment-neutral local/shared-hosting guidance.
- Preserved Phase 7 Vercel reports and evidence as explicitly retired historical audit records.
- Recheck passed: frontend tests `30/30`, backend typecheck, backend tests `77 passed` with one opt-in database integration test skipped, and both npm audits reported zero vulnerabilities.
- Kept live hosting access, database migration, DNS, shared-host routing, SMTP, Midtrans, commit, and push outside this dry-run phase.

### Phase 8F shared hosting preflight package — 2026-07-22

- Added a standalone cPanel/shared-hosting preflight CLI with 20 fail-closed checks for Node.js 24, native Argon2, engine lock, startup/key files, storage permissions, required environment controls, HTTPS, Secure cookies, and wildcard-free CORS.
- Added regression coverage proving the complete baseline passes, Node.js 22/insecure configuration fails, and secret values never appear in serialized output.
- Added a shared-hosting guide for cPanel mapping, execution order, sanitized evidence, and deployment stop conditions.
- Verified positive preflight at `20/20`, negative empty-environment exit at nine failed controls, frontend tests at `30/30`, backend typecheck, and backend tests at `80 passed` with one opt-in database integration test skipped.
- Kept all remote hosting mutation, database operations, Passenger restart, DNS/TLS, frontend upload/routing, SMTP, Midtrans, commit, and push outside the local preflight package.

### Pre-8F remote frontend visual and SEO revision — 2026-07-22

- Rebuilt the public landing page with a responsive navy/indigo futuristic hero, green badge/checklist, blue-to-orange gradient headline, orange-pink CTA, macOS-style terminal, and glassmorphism status badges.
- Added locked-scope feature and Starter/Basic/Pro overview sections without adding product capabilities.
- Restyled the authenticated dashboard main page with the same dark glass visual system while preserving API/data selectors and `noindex` behavior.
- Added canonical, robots, Open Graph, Twitter, `WebSite` JSON-LD, descriptive metadata, and a lightweight SVG favicon to the public landing page.
- Added SEO/visual regression tests and completed desktop plus 390px mobile browser QA with no horizontal overflow.
- Kept backend/API/database, auth credential behavior, remote hosting, commit, and push outside this visual revision.

### Phase 8F provider runtime confirmation — 2026-07-22

- Recorded provider confirmation that shared hosting now offers Node.js `v24.18.0`, satisfying the locked `>=24.7 <25` capability requirement.
- Preserved the distinction between provider capability and effective cPanel application evidence; `node -v` and `hosting:preflight` still must run inside the selected application environment.
- Kept Passenger registration, dependency installation, database operations, DNS/routing, commit, and push outside this confirmation update.

### Phase 8G database and modular CRUD architecture — 2026-07-22

- Audited all 20 MariaDB tables for module ownership, relationships, indexes, integrity constraints, and lifecycle/delete policy.
- Expanded the database dictionary and added shared-hosting MariaDB provisioning, backup, migration, verification, rollback, and sanitized-evidence guidance.
- Added automated contracts for schema/index invariants, repository interface/MySQL adapter separation, prepared domain SQL, and complete card/social/catalog CRUD routes.
- Corrected the `test:db` path casing from `tests/integration` to tracked `tests/Integration` for case-sensitive Linux hosting compatibility.
- Confirmed no schema migration or OpenAPI change was required; payment/audit/event/log records intentionally remain lifecycle-managed or append-only rather than generic CRUD.
- Passed backend typecheck, contract tests `3/3`, full backend tests `83 passed` with one opt-in database test skipped, and fresh disposable MariaDB integration `1/1`.
- Stopped the isolated no-network MariaDB process and removed its temporary database directory after verification.

### Phase 8H–8M shared-hosting staging and production gate — 2026-07-22

- Added a checksum/secret-artifact-aware shared-hosting release verifier and ordered cPanel Node.js 24/Passenger/backend/database execution checklist.
- Documented preferred same-origin frontend/API routing and a reviewed sibling API-subdomain fallback without assuming unsupported `.htaccess` proxy behavior.
- Fixed readable CSRF cookie scope from `/api/v1` to `/` so frontend pages can echo session-bound CSRF values; kept authentication credentials HttpOnly and API-path restricted, and updated OpenAPI/security docs/tests.
- Expanded Postman with complete social/catalog CRUD, theme, public QR/VCF, subscription, final destructive cleanup, a shared-hosting environment template, and automated route coverage.
- Fixed password-reset links to the actual `/reset-password/` frontend route and made mail worker success/failure write transactional masked delivery logs.
- Added a secret-safe SMTP connection verifier and a live SMTP/OTP/cron plus Midtrans sandbox validation runbook.
- Passed final local gates: backend typecheck; backend `85 passed`, one opt-in DB test skipped; frontend `33/33`; both dependency audits zero vulnerabilities; OpenAPI and Postman parse; release secret scan clean.
- Passed fresh disposable MariaDB integration `1/1` and backup-to-separate-restore rehearsal with 21 tables, 3 matching migration checksums, and matching `3/33/10/14` seed counts; temporary data/dumps were removed.
- Reached Phase 8M decision: production remains no-go until effective cPanel deployment, routing/HTTPS, E2E UAT, live SMTP/cron, Midtrans sandbox, provider restore/rollback, approved release identity, and CSP/performance gates pass.

### Local E2E UI QA and browser runtime fixes — 2026-07-22

- Recorded product-owner deferral of remote Phases 8H, 8I, and 8J without waiving their production evidence gates.
- Finalized the landing wording as `Jejaring tanpa batas.`, moved the Secure badge below QR Ready, and corrected a malformed responsive utility class.
- Fixed native browser `fetch` invocation to preserve the required global receiver; the prior call produced `Illegal invocation` before any API request.
- Fixed strict no-body POST requests so logout, publish, claim, and reconciliation do not send the invalid JSON literal `null` to Express.
- Added native regression coverage for browser fetch receiver and null-payload omission; frontend tests pass `35/35`.
- Passed 11 temporary Chrome E2E scenarios covering four-role login/logout and cookie policy, admin/tier boundaries, reversible Basic CRUD/theme, public QR/VCF, and desktop/mobile responsive overflow.
- Kept temporary Playwright dependencies, QA credentials, screenshots, and traces outside the repository.

### Public root-card defect fix — 2026-07-23

- Fixed canonical `/{slug}` URLs that previously returned Apache 404 even though the public aggregate API was healthy.
- Added a static Apache one-segment rewrite, responsive public-card shell, case-sensitive path parser, aggregate-to-theme adapter, allowlisted theme-template loader, VCF/QR actions, Pro WhatsApp action, catalog rendering, and safe loading/error states.
- Preserved real frontend files/directories and `/api/v1`; no API, schema, auth, membership, or payment contract changed.
- Added public slug, adapter, rewrite isolation, semantic shell, and DOM-security regression coverage; frontend tests pass `41/41`.
- Passed six Chrome E2E scenarios for Starter/Basic/Pro canonical rendering, exact themes, QR/VCF, wrong-case/unknown slug handling, and 390px mobile overflow.
- Documented that the static fallback renders invalid slugs as `noindex` after an API 404 but cannot emit a true root HTTP 404 without edge/server rendering.

### Ten-card visual template implementation — 2026-07-23

- Implemented the approved S1, B1, revised B2, P1, revised P2/P3, P4, and three vertical Pro compositions as reusable HTML/CSS templates.
- Removed visible membership labels from generated/public card artwork and the public shell.
- Added proportional container-responsive spacing, two-line wrapping, adaptive typography/density classes, and graceful empty-field collapse.
- Kept company logo slots Pro-only and hid unused slots without leaving layout gaps.
- Added locked-catalog/template regression coverage and passed frontend tests `44/44`.
- Passed Chrome visual QA for all ten themes at desktop and 430px mobile widths with alternating normal and stress-length content.

### Local card-theme integration QA — 2026-07-23

- Retested the committed card templates against the local Apache/Node/MariaDB same-origin stack and four seeded QA roles.
- Passed 16 browser assertions covering 1/3/10 entitlements, locked-theme rejection, UI theme persistence, plan-label-free public rendering, QR/VCF, 390px stress content, and Basic/Pro logo boundaries.
- Passed frontend `44/44`, backend strict typecheck, and backend `85 passed` with one opt-in database test skipped.
- Restored every mutated theme/contact/logo record and removed generated QR/logo artifacts after verification.

### Card-theme preview synchronization — 2026-07-24

- Regenerated all ten theme-picker PNG previews directly from the committed HTML/CSS compositions.
- Removed obsolete Starter/Basic/Pro badges from preview artwork and aligned B2 plus revised P2/P3 with their runtime templates.
- Standardized preview sample data to Begitu Indah, SE and used a neutral company-logo placeholder only for Pro themes.
- Preserved locked dimensions at `1573x1000` for seven landscape previews and `1000x1573` for three portrait previews.
- Added registry-driven PNG signature, non-empty asset, dimension, and orientation regression coverage.

### Runtime-synchronized card thumbnails — 2026-08-04

- Replaced manually drawn picker thumbnails with isolated live renders of the
  current card templates, shared theme CSS, and safe card renderer.
- Kept versioned registry PNGs as fallback/admin assets and forced cache
  revalidation for the registry, templates, and theme stylesheet.

### Consistent light member workspace — 2026-08-04

- Scoped legacy dark utility overrides away from the selected light theme so
  forms, panels, text, and controls use the same monochrome workspace tokens as
  the dashboard and feedback pages.
- Aligned light theme-picker cards and selected states with the shared solid
  surface, border, ink, and muted-color system without changing dark mode.

### Portrait card field parity — 2026-08-04

- Made office phone, mobile phone, email, website, address, and social links
  visibly available on all three portrait themes instead of screen-reader-only.
- Rebalanced portrait logo, identity, contact, social, and QR density while
  retaining each approved visual composition and collapsed empty rows.

### P5–P7 approved portrait visual realignment — 2026-07-24

- Realigned P5 with the approved midnight layered-glass composition and cyan edge glow.
- Realigned P6 with the approved ivory folded-paper composition, navy corners, and restrained gold trim.
- Realigned P7 with the approved raised white identity panel and indigo translucent-glass environment.
- Kept the visible hierarchy focused on company logo, name, role, organization, address, and QR while retaining the normalized contact-field contract for accessibility and card actions.
- Kept every generated and preview composition free of visible membership labels.

### CR-003 consistent app shell and user feedback — 2026-07-24

- Added one shared authenticated application shell with persistent desktop sidebar, accessible mobile menu, active-page state, shared logout, and restrained reduced-motion-aware navigation transitions.
- Applied the shell to Overview, Identity, Contact, Design, Settings/QR, Social, Catalog, Billing, Account, and the new User Feedback page.
- Added a live-counted open improvement question with strict 1–300 character validation.
- Added CSRF-protected `POST /api/v1/feedback` using a thin Controller, Service business boundary, repository interface, and parameterized MySQL adapter.
- Added forward migration `004_user_feedback.sql`, schema/data-dictionary/OpenAPI updates, and frontend/backend regression coverage.

### Review-report consolidation — 2026-07-24

- Consolidated the historical v2.0 through v2.5 repository reviews into the canonical `review-report.md`.
- Removed five superseded version-specific report files and preserved their findings in chronological sections.
- Clarified that historical readiness statements do not override current `STATUS.md`, `CHANGELOG.md`, or Decision Log authority.
