# Frontend Repository Status

Updated: 2026-09-01

Overall: **SOT reintegration Phase 6 complete; remaining frontend implementation and final UAT pending.**

## Baseline

| Area | Status |
|---|---|
| Repository boundary | Frontend-only |
| Stack | Static HTML, Vanilla JS modules, Tailwind CSS 4 |
| Canonical hosting | Vercel |
| Backend | Separate repository/shared-hosted API |
| Static build | 152 allowlisted runtime files in `dist/` |
| Automated tests | 110 passing; no known test failure |
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

## Incomplete locked frontend scope

- Complete edit/reorder workflow for social links and catalog items.
- Editor controls for Maps, logo, and WhatsApp fields already supported by the
  presentation contract.
- True unsaved-form live preview on design/editor flow.
- Remaining admin plan/payment/theme/activity/QR operations where required by
  approved frontend scope and available backend API.

## Reintegration phase status

| Phase | Status |
|---|---|
| 1. Human decisions | Complete |
| 2. Deployment safety | Complete |
| 3. Legacy quarantine | Complete |
| 4. Canonical frontend SOT | Complete |
| 5. Security/runtime remediation | Complete |
| 6. Product-rule reconciliation | Complete |
| 7. Remaining frontend implementation | Pending instruction |
| 8. Duplication/orphan cleanup | Pending |
| 9. Documentation synchronization | Pending |
| 10. Final validation/readiness report | Pending |

## Validation note

`npm run build` passes and produces 152 allowlisted runtime files. Full `npm test`
passes all 110 tests, including the repository-local same-origin stack/proxy test.
No live Vercel deployment, external API mutation, or server cleanup was performed
during SOT reintegration.
