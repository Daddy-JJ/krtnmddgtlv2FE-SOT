# Frontend Repository Status

Updated: 2026-09-12

Overall: **Frontend source and SOT aligned; local frontend/API/database integration verified. Production readiness still requires external UAT.**

## Baseline

| Area | Status |
|---|---|
| Repository boundary | Frontend-only |
| Stack | Static HTML, Vanilla JS modules, Tailwind CSS 4 |
| Canonical hosting | Vercel |
| Backend | Separate repository/shared-hosted API |
| Static build | 158 allowlisted runtime files in `dist/` |
| Automated tests | 129 passing; no known test failure |
| Launch locale | Bahasa Indonesia |
| English | Deferred; scaffold remains |
| Checkout | Paused pending explicit Midtrans API readiness decision |
| Production readiness | Not yet approved |

## Implemented frontend surfaces

| Surface | Current implementation |
|---|---|
| Public marketing | Landing, About, FAQ, Contact, legal pages, two blog articles, SEO metadata |
| Authentication | Register, OTP verify/resend, login/logout, forgot/reset password |
| Starter | Anonymous creation, email handoff, Login/Signup claim flow |
| Member workspace | Dashboard, card editor/settings/design/social/catalog, billing, account, feedback |
| Card editor | Maps input, derived WhatsApp guidance, and active-theme preview of unsaved form data |
| Public card | Root slug shell, ten templates, adaptive fields, QR/vCard links |
| Card themes | 1 Starter, 3 cumulative Basic, 10 cumulative Pro |
| Resume Enhancement | Pro member forms/detail/revision, DOCX 10 MB validation, internal workspaces |
| Internal workspace | Super Admin and assignment-scoped CV Specialist shells |
| API transport | Cookie credentials, CSRF contexts, timeout, refresh, normalized errors |
| Deployment | `dist/` allowlist and Vercel HTTPS upstream proxy |

## Locked decisions reconciled in Phase 6

- First visit tanpa stored preference menampilkan chooser Light/Dark yang dapat
  dioperasikan dengan keyboard; toggle global tetap tersedia setelah memilih.
- Checkout CTA tetap disabled, controller billing tidak memiliki jalur checkout,
  dan seluruh note pause memakai exact `Under development`.
- Runtime locale hanya `id`; English JSON tetap berada di repository sebagai
  dormant scaffold dan permintaan locale `en` fail-safe ke Bahasa Indonesia.

## Phase 5 remediation completed

1. `safeReturnTo()` accepts only normalized same-origin paths and rejects literal
   or encoded slash-confusion variants.
2. Request API serta resume/admin/public download links share `buildApiUrl()` and
   the configured API base.
3. Starter name length validation now operates on cleaned name text only.
4. Every deployed top-level runtime directory is covered by reserved slug tests.
5. Login routes Super Admin, CV Specialist, and Resume Service Admin according
   to their approved workspace. The retired Resume Quality Reviewer claim fails
   closed to the member workspace.
6. Local-stack tests use a repository-local frontend helper and no longer import
   a missing monorepo tool.

## Phase 7 implementation completed

- Added nullable HTTP(S) Maps editing through the existing complete card update
  payload while preserving the rest of the contact data.
- Added a read-only WhatsApp CTA explanation tied to the mobile number; no
  browser-supplied WhatsApp URL was introduced. FE-D-012 subsequently makes the
  public CTA available to all tiers through a non-persisted, normalized `wa.me`
  shortlink when the saved Indonesian mobile number is valid.
- Added isolated active-theme preview that updates from unsaved editor form data
  and continues to use saved theme/logo/QR/social values.
- Social and catalog create/list/delete flows now append and display items in a
  deterministic saved order, show position/publication state, and no longer
  expose a misleading manual sort-order field.
- Audited Super Admin operations and retained only the already contracted
  statistics/user/card/subscription/usage/intervention/settings/activity/mail,
  landing-content, specialist, and Resume Services families.

## External API dependencies and final validation

- Editing existing social/catalog entries and explicit reordering require
  synchronized update/reorder methods, paths, payloads, and authorization rules.
- Logo upload/delete requires an approved multipart endpoint and its file-policy
  contract; the frontend currently renders an existing `logoUrl` only.
- Admin plan/payment/theme mutations and QR regeneration require explicit backend
  contracts. Activity remains available as a read-only surface.
- Browser integration against staging/Postman and product-owner UAT remain
  required before production-readiness approval.

## Phase 8 duplication/orphan cleanup completed

- Design gallery and unsaved editor preview now share one allowlisted theme
  catalog/template loader, isolated renderer, scaling controller, and host style.
- Resume creation and pending-source upload now share one DOCX-only 10 MB
  validator instead of carrying identical business-rule copies.
- `GET /me` now has one frontend service owner through `authService.current()`;
  Super Admin, landing editor, and CV Specialist guards reuse it.
- Removed 29 redundant `.gitkeep` files, two stale pseudo-component README files,
  the empty `layouts/` deployment entry and stale reserved-slug entry, plus the
  resulting empty directories.
- Added runtime module-graph tests for HTML entries, relative imports, orphan
  classification, and single-owner responsibilities.
- Preserved intentional variants: compatibility redirects, dormant Indonesian/
  English i18n scaffolding, paused checkout adapter, public-card renderer, and
  unreferenced brand raster assets whose external use cannot be disproved.

## Phase 9 documentation synchronization completed

- Updated onboarding, AI context, security, contribution, deployment, and review
  documents so resolved Phase 5–8 work is no longer presented as pending.
- Updated `AGENTS.md`, `SOT-MANIFEST.md`, `PROJECT-STRUCTURE.md`, and
  `FILE-INDEX.md` with explicit ownership, anti-duplication, and derived-map rules.
- Verified the documented inventory against 60 route shells, 27 page controllers,
  ten card-theme templates, and the 154-file deployment build.
- Preserved locked product decisions and API-bound gaps without inventing backend
  endpoints or marking external readiness evidence complete.

## Phase 10 final validation/readiness completed

- Re-checked 95 JavaScript/MJS files, six JSON configurations, dependency tree,
  module graph, Markdown references, runtime inventory, symlinks, orphan markers,
  potential secrets, unsafe DOM sinks, Web Storage, and checkout callers.
- Found and fixed one local deployment defect: the canonical Vercel configuration
  did not explicitly mirror the baseline browser security headers from Apache.
- Added regression coverage for Vercel/Apache header parity and for keeping only a
  validated Starter public ID—not a token—in claim `sessionStorage`.
- Clean QA produces 154 allowlisted files and passes all 125 tests.
- Local verdict is PASS for checkpoint commit and Vercel Preview; production
  promotion remains blocked by the external validation evidence listed above.

## Local Starter and development-server remediation

- Added the Node local server entry point through npm run dev on
  127.0.0.1:8080, with one-segment case-preserving public slug routing,
  allowlisted asset serving, and an optional /api/v1 proxy to backend port 3000.
- Starter creation now gives SMTP up to 30 seconds and never retries the POST
  after a timeout; a card result remains visible when email delivery fails.
- Email delivery notices require data.emailSent to be the boolean true.
- Added routing, asset, email handoff, fragment cleanup, and timeout contract
  coverage. No real Starter record was created during QA.

## Email template management - Stages 1-4

- Product direction and Stage 1 execution approved by owner (FE-D-010).
- Read-only backend inventory: seven template entries across Starter, OTP,
  password reset, Resume completion, and retention reminders at 30/7/1 days.
- Editor fields, required security blocks, draft/publication lifecycle, initial
  API, migration/version requirements, and future QA gates documented in
  `docs/06-EMAIL-TEMPLATE-MANAGEMENT.md`.
- Backend work brief: `docs/EMAIL-TEMPLATES-BACKEND-HANDOFF.md`.
- Runtime editor, service adapter, validator, and noindex route are implemented
  through the existing Super Admin shell at `/admin/mail/templates/`.
- The editor supports seven fixed templates, structured paragraphs/emphasis,
  required action/security blocks, brand/color fields, draft save, backend
  preview, test-send/status, publication, immutable history, and restore-to-draft.
- Migration 010 is applied to the local main backend database, the feature flag
  is active, and the restarted API exposes the authenticated route family.
- Local Stage 4 QA builds 158 allowlisted files and passes 129/129 tests. Live
  frontend 8080 and backend 3000 probes pass, including exact `/PCiZZvU` routing.
- Backend Stage 2 source and guarded `_test` integration QA completed on
  2026-09-06. Main database migration 010 is applied, feature flag is true, and
  the unauthenticated route probe returns 401. No real email was sent.
- Remaining external gate: authenticated Super Admin mutation checks and
  designated-mailbox UAT. No commit, push, or deployment was performed.

## WhatsApp CTA history (superseded)

- FE-D-012 previously enabled the CTA for all tiers. FE-D-017 now reconfirms
  that rule and supersedes FE-D-015's Pro-only entitlement; current source
  renders backend-derived WhatsApp for all tiers.
- Indonesian mobile input is normalized to an official digits-only
  `https://wa.me/62...` shortlink; missing or invalid values keep the CTA
  hidden on every tier.
- The existing card action language is preserved with a responsive four, two,
  or one-column layout when WhatsApp is available.
- Local QA on 2026-09-09 builds 158 allowlisted files and passes 140/140 tests.
  The live `/PCiZZvU` shell, JavaScript, CSS, and public mobile aggregate respond
  successfully without creating or modifying backend data.

## Starter form and direct Signup

- FE-D-013 makes Mr/Mrs/Ms, last name, and website optional while retaining a
  required first name and the existing backend contact.fullName payload.
- FE-D-014 exchanges the email token, removes its fragment, and opens Signup
  directly. Signup fetches the cookie-authorized email from signup-context and
  keeps it read-only.
- Login is hidden for the new-user path and appears only after backend code
  EMAIL_ALREADY_EXISTS. No email or handoff token is persisted in URL or Web
  Storage.
- Local QA on 2026-09-11 builds 158 allowlisted files and passes 142/142 tests.
  Frontend port 8080 and backend port 3000 were exercised together: direct and
  proxied health returned HTTP 200, CORS preflight returned HTTP 204, and the
  exact-case public slug shell plus global CSS returned HTTP 200.

## Prefix-aware card display

- FE-D-018 keeps Mr/Ms/Mrs separate in the identity editor while preserving the
  legacy `contact.fullName` API payload and optional last name.
- Public card artwork now renders the name without the prefix and appends `♂`
  for Mr or `♀` for Ms/Mrs. Unprefixed names remain unchanged.
- Regression coverage exercises parsing, one-word names, and the rendered
  display format in `tests/public-card-presenter.test.js` and
  `tests/card-editor-contract.test.js`.

## Reset-only account security UX

- FE-D-020 supersedes the account-page presentation from FE-D-019.
- `/app/account/` contains only Reset Password; the email-status and OTP panels
  are no longer rendered or controlled there.
- Reset-password requests use the backend-owned, read-only account email loaded
  through GET /me. OTP remains in the dedicated `/verify-email/` flow.

## Reintegration phase status

| Phase | Status |
|---|---|
| 1. Human decisions | Complete |
| 2. Deployment safety | Complete |
| 3. Legacy quarantine | Complete |
| 4. Canonical frontend SOT | Complete |
| 5. Security/runtime remediation | Complete |
| 6. Product-rule reconciliation | Complete |
| 7. Remaining frontend implementation | Complete within active API contract |
| 8. Duplication/orphan cleanup | Complete |
| 9. Documentation synchronization | Complete |
| 10. Final validation/readiness report | Complete; external gates remain |

## Validation note

`npm run build` passes and produces 158 allowlisted runtime files. Full `npm test`
passes all 142 tests, including public slug routing, asset serving, Starter email
handoff, and the repository-local same-origin stack/proxy.
No live Vercel deployment or production/main-database mutation was performed
during SOT reintegration.

## 2026-09-11 Node/QR/Starter integration verification

- Node.js/Express is the official backend; PHP/Laravel and Endroid QR are
  superseded references only.
- The backend preflight verified database `krtnmdgtlv2`, all 14 migrations,
  and the binary unique slug index after a timestamped logical backup.
- Migration 012 aligns Click-to-WhatsApp with the authoritative all-tier rule;
  migration 011 remains historical. The frontend accepts only a backend-derived
  safe `wa.me` URL and does not derive it from public contact data.
- Isolated testing-runtime E2E verified Starter HTTP 201, an exact seven-letter
  case-sensitive slug, public profile HTTP 200, wrong-case HTTP 404, QR PNG
  HTTP 200/304, VCF HTTP 200, and rejection of client-supplied or unauthorized
  slug changes. The test database baseline was rebuilt afterward.
- `PCiZZvU` was verified as a public-card shell through `npm run dev`, not
  merely as an HTTP 200 response. The backend and frontend runtime processes
  were stopped after smoke testing; MariaDB remains available for local work.

## 2026-09-12 owner clarification

- Starter creation remains anonymous and does not require Login or Signup.
- A user who wants to maintain or edit that Starter card must create or use a
  verified account and claim the specific card through the existing secure
  email-handoff flow.
- Checkout remains intentionally paused until the product owner explicitly
  confirms that the Midtrans API integration is ready. No checkout code or
  payment request was activated by this clarification.
