# Frontend Repository Status

Updated: 2026-09-05

Overall: **SOT reintegration Phase 10 complete; local readiness passed, production approval pending external Vercel/backend/UAT evidence.**

## Baseline

| Area | Status |
|---|---|
| Repository boundary | Frontend-only |
| Stack | Static HTML, Vanilla JS modules, Tailwind CSS 4 |
| Canonical hosting | Vercel |
| Backend | Separate repository/shared-hosted API |
| Static build | 154 allowlisted runtime files in `dist/` |
| Automated tests | 125 passing; no known test failure |
| Launch locale | Bahasa Indonesia |
| English | Deferred; scaffold remains |
| Checkout | Paused |
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
5. Login routes Super Admin, CV Specialist, Resume Quality Reviewer, and Resume
   Service Admin according to their approved workspace.
6. Local-stack tests use a repository-local frontend helper and no longer import
   a missing monorepo tool.

## Phase 7 implementation completed

- Added nullable HTTP(S) Maps editing through the existing complete card update
  payload while preserving the rest of the contact data.
- Added a read-only WhatsApp CTA explanation tied to the mobile number; no
  browser-supplied WhatsApp URL was introduced.
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

`npm run build` passes and produces 154 allowlisted runtime files. Full `npm test`
passes all 125 tests, including public slug routing, asset serving, Starter email
handoff, and the repository-local same-origin stack/proxy.
No live Vercel deployment, external API mutation, or server cleanup was performed
during SOT reintegration.
