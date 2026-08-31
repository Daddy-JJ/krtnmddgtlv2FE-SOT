# File Index

## Start here

| File | Purpose |
|---|---|
| `README.md` | Entry point |
| `AGENTS.md` | Aturan AI/developer |
| `AI_CONTEXT.md` | Konteks ringkas |
| `LOCKED-PLAN.md` | Keputusan terkunci |
| `STATUS.md` | Status implementasi |
| `SOT-MANIFEST.md` | Precedence/peta SSOT |
| `review-report.md` | Consolidated historical review record v2.0–v2.5 |

## Product and engineering docs

`docs/00-EXECUTIVE-SUMMARY.md` sampai `docs/30-REFERENCES.md` mencakup business, PRD, UX, data, API, security, roadmap, testing, deployment, dan governance.

## Technical

- `docs/backend/`: aturan backend.
- `docs/frontend/`: aturan frontend.
- `openapi/openapi.yaml`: contract machine-readable.
- `database/schema-reference.sql`: schema reference.
- `database/seed-reference.md`: plan, capability, dan theme seed truth.
- `prompts/`: prompt Codex per fase.
- `templates/`: template perubahan/UAT/API.
- `MANIFEST.json` dan `MANIFEST.sha256`: tracking file/checksum.

## QR v2.1
- `docs/31-QR-UX-ADMIN-IMPACT.md`
- `docs/backend/09-QR-CODE-SPEC.md`
- `docs/backend/10-VCARD-RENDERING.md`
- `docs/backend/17-ADMIN-PANEL.md`

## URL and slug v2.2

| File | Purpose |
|---|---|
| `docs/backend/18-SLUG-URL-SPEC.md` | Starter random URL and Basic/Pro custom URL rules |

## Midtrans v2.3
- docs/backend/19-MIDTRANS-INTEGRATION-SPEC.md
- docs/backend/20-SUBSCRIPTION-LIFECYCLE.md
- docs/backend/21-ADMIN-PAYMENT-OPERATIONS.md
- docs/frontend/11-BILLING-UX.md
- docs/32-MEMBERSHIP-UPGRADE-FLOW.md
- prompts/10-MIDTRANS-MEMBERSHIP.md

## Card themes v2.4

| File | Purpose |
|---|---|
| `docs/33-CARD-THEME-CATALOG.md` | Ten approved themes and field contract |
| `docs/backend/22-THEME-ENGINE-SPEC.md` | Backend theme rules |
| `docs/frontend/12-CARD-THEME-EDITOR.md` | User control panel and live preview |
| `frontend/config/theme-registry.json` | Machine-readable theme catalog |
| `database/seeds/002-card-themes.sql` | Theme and plan access seeds |
| `prompts/11-CARD-THEME-IMPLEMENTATION.md` | Codex execution prompt |

## Official email v2.5
- `docs/34-OFFICIAL-EMAIL-ARCHITECTURE.md`
- `docs/35-CPANEL-MAIL-SETUP-CHECKLIST.md`
- `docs/backend/23-EMAIL-OTP-SPEC.md`
- `docs/backend/24-TRANSACTIONAL-EMAIL-SPEC.md`
- `docs/frontend/13-EMAIL-OTP-UX.md`
- `prompts/12-OFFICIAL-EMAIL-OTP.md`

## Reconciliation v2.5.1
- `docs/36-CHANGE-REQUEST-CR-001-SOT-RECONCILIATION.md`
- `docs/27-DECISION-LOG.md` D-027 through D-030

## Implementation reports

- `docs/109-CHANGE-REQUEST-CR-011-LANDING-PAGE-CONTENT-MANAGEMENT.md` — typed Super Admin landing wording workflow.
- `docs/110-CHANGE-REQUEST-CR-012-INTERNAL-ACCOUNT-PROVISIONING.md` — secure create-only production internal-user provisioning.
- `docs/37-PHASE-1-FOUNDATION-REPORT.md`
- `docs/38-BACKEND-API-READINESS-REPORT.md`
- `docs/39-QA-SECURITY-EXECUTION-PLAN.md`
- `qa/postman/`: curated Postman collection and local environment
- `docs/40-CHANGE-REQUEST-CR-002-NODE-EXPRESS-MIGRATION.md`
- `docs/41-PHASE-1M-NODE-EXPRESS-REPORT.md`
- `docs/42-PHASE-2A-AUTH-SECURITY-FOUNDATION-REPORT.md`
- `docs/43-PHASE-2B-AUTH-API-REPORT.md`
- `docs/44-PHASE-2C-STARTER-WORKFLOW-REPORT.md`
- `docs/45-PHASE-3A-CARD-CORE-FOUNDATION-REPORT.md`
- `docs/46-PHASE-3B-CARD-CRUD-REPORT.md`
- `docs/47-PHASE-3C-CARD-CUSTOMIZATION-PUBLISH-REPORT.md`
- `docs/48-PHASE-4A-VCARD-REPORT.md`
- `docs/49-PHASE-4B-QR-PNG-REPORT.md`
- `docs/50-PHASE-4C-SOCIAL-CATALOG-REPORT.md`
- `docs/51-PHASE-4D-LOGO-MAPS-WHATSAPP-REPORT.md`
- `docs/52-PHASE-5A-PAYMENT-FOUNDATION-REPORT.md`
- `docs/53-PHASE-5B-CHECKOUT-HISTORY-REPORT.md`
- `docs/54-PHASE-5C-WEBHOOK-SUBSCRIPTION-REPORT.md`
- `docs/55-PHASE-5D-RECONCILIATION-ADMIN-REPORT.md`
- `docs/56-PHASE-6A-FRONTEND-FOUNDATION-REPORT.md`
- `docs/57-PHASE-6B-AUTH-STARTER-UI-REPORT.md`
- `docs/58-PHASE-6C-DASHBOARD-SHELL-REPORT.md`
- `docs/59-PHASE-6D-CARD-IDENTITY-CONTACT-EDITOR-REPORT.md`
- `docs/60-PHASE-6E-CARD-SETTINGS-QR-REPORT.md`
- `docs/61-PHASE-6F-THEME-PICKER-REPORT.md`
- `docs/62-PHASE-6G-SOCIAL-CATALOG-EDITOR-REPORT.md`
- `docs/63-PHASE-6H-BILLING-PAYMENT-UI-REPORT.md`
- `docs/64-PHASE-6I-ACCOUNT-SECURITY-UI-REPORT.md`
- `docs/65-PHASE-6QA-INTEGRATED-FRONTEND-QA-REPORT.md`
- `docs/66-ME-API-CONTRACT-CLEANUP-REPORT.md`
- `docs/67-PHASE-7A-RELEASE-READINESS-PACKAGE-REPORT.md`
- `docs/68-PHASE-7B-UAT-ENVIRONMENT-GATE-REPORT.md`
- `docs/69-PHASE-7B-VERCEL-FRONTEND-BACKEND-STAGING-GATE.md`
- `docs/70-PHASE-7C-VERCEL-PREVIEW-PREFLIGHT-REPORT.md`
- `docs/71-PHASE-7F-BROWSER-DEVICE-UAT-REPORT.md`
- `docs/72-PHASE-7G-UAT-RUNTIME-STABILIZATION-REPORT.md`
- `docs/73-PHASE-7H-MANUAL-BROWSER-DEVICE-UAT-RUNBOOK.md`
- `docs/74-PHASE-7I-VERCEL-GIT-INTEGRATION-HARDENING-REPORT.md`
- `docs/75-PHASE-7J-PUBLIC-ACCESS-UNBLOCK-REPORT.md`
- `docs/76-PHASE-7K-STABLE-BACKEND-STAGING-REPORT.md`
- `docs/77-PHASE-7L-END-TO-END-UAT-GATE-REPORT.md`
- `docs/78-PHASE-7M-PRODUCTION-READINESS-SECURITY-FINAL-REPORT.md`
- `docs/79-PHASE-7N-PRODUCTION-DEPLOYMENT-DECISION.md`
- `docs/80-PHASE-8A-STABLE-BACKEND-STAGING-PROVISIONING-PACKAGE.md`
- `docs/81-PHASE-8B-BACKEND-STAGING-DEPLOYMENT-RUNBOOK.md`
- `docs/82-PHASE-8C-SHARED-HOSTING-COMPATIBILITY-ASSESSMENT.md`
- `docs/83-PHASE-8D-SHARED-HOSTING-NODE-READINESS-CHECKLIST.md`
- `docs/84-PHASE-8E-SHARED-HOSTING-DRY-RUN.md`
- `docs/85-PHASE-8E-VERCEL-RETIREMENT-RECHECK.md`
- `docs/86-PHASE-8F-SHARED-HOSTING-PREFLIGHT-PACKAGE.md`
- `docs/87-PRE-8F-FRONTEND-VISUAL-SEO-REVISION.md`
- `docs/88-PHASE-8G-DATABASE-CRUD-MODULAR-ARCHITECTURE-AUDIT.md`
- `docs/89-PHASE-8H-SHARED-HOSTING-BACKEND-STAGING-DEPLOYMENT.md`
- `docs/90-PHASE-8I-FRONTEND-SHARED-HOSTING-API-ROUTING.md`
- `docs/91-PHASE-8J-POSTMAN-E2E-CRUD-UAT.md`
- `docs/92-PHASE-8K-SMTP-MAIL-WORKER-MIDTRANS-SANDBOX.md`
- `docs/93-PHASE-8L-QA-SECURITY-BACKUP-ROLLBACK.md`
- `docs/94-PHASE-8M-PRODUCTION-GO-NO-GO.md`
- `docs/95-LOCAL-E2E-UI-QA-REPORT.md`
- `docs/96-PUBLIC-ROOT-CARD-DEFECT-FIX-REPORT.md`
- `docs/97-CHANGE-REQUEST-CR-003-APP-SHELL-FEEDBACK.md`
- `docs/98-CHANGE-REQUEST-CR-004-RESUME-ENHANCEMENT-RBAC.md`
- `docs/99-RESUME-ENHANCEMENT-PRO-PERK.md`
- `docs/100-RESUME-SERVICE-OPERATIONS.md`
- `docs/101-RESUME-SERVICE-PRIVACY.md`
- `docs/102-PHASE-9-RESUME-ENHANCEMENT-RBAC-QA-REPORT.md`
- `docs/103-CHANGE-REQUEST-CR-005-ANNUAL-SUBSCRIPTION-ALIGNMENT.md`
- `docs/104-CHANGE-REQUEST-CR-006-FIXED-UPGRADE-FEES.md`
- `docs/105-CHANGE-REQUEST-CR-007-NODE-22-COMPATIBILITY.md`
- `docs/106-CHANGE-REQUEST-CR-008-UTC-PERSISTENCE-CONSISTENCY.md`
- `docs/107-CHANGE-REQUEST-CR-009-SCRYPT-PASSWORD-HASHING.md`
- `docs/108-CHANGE-REQUEST-CR-010-LITESPEED-PASSENGER-STARTUP.md`
- `qa/UAT-EVIDENCE-LOG.md`
- `backend/package.json`, `backend/package-lock.json`, `backend/dependency-requirements.md`
- `database/development-seeds/900-development-dummy-data.sql`: standalone, idempotent dummy fixture for every physical table in `database/schema-reference.sql`; import only on local/test databases.
- `deploy/`: non-secret deployment templates for stable backend hosting.
- `deploy/BACKEND-STAGING-INTAKE.md`: infrastructure intake checklist before live backend staging deployment.
- `deploy/shared-hosting/README.md`: Node.js 22.18 cPanel preflight and sanitized evidence guide.
- `deploy/shared-hosting/DATABASE-PROVISIONING.md`: MariaDB least-privilege, backup, migration, verification, and rollback guide.
- `deploy/shared-hosting/BACKEND-STAGING-EXECUTION.md`: ordered cPanel/Passenger staging execution and smoke gate.
- `deploy/shared-hosting/FRONTEND-API-ROUTING.md`: same-origin and reviewed API-subdomain frontend routing models.
- `deploy/shared-hosting/EXTERNAL-SERVICES-VALIDATION.md`: SMTP/cron and Midtrans sandbox validation gate.
- `backend/scripts/hosting-preflight.ts`: fail-closed shared-hosting runtime/environment/filesystem preflight.
- `backend/tests/Unit/modular-database-contract.test.ts`: schema/index, repository boundary, prepared SQL, and CRUD route contract.
- `backend/scripts/smtp-verify.ts`: secret-safe SMTP/TLS/auth connectivity check without sending mail.
- `tools/verify-shared-hosting-release.mjs`: release inventory, checksum, engine, and secret-artifact exclusion verifier.
- `tools/local-stack.mjs`: Node 22 localhost runner untuk frontend statis dan proxy same-origin `/api/v1` ke backend.
- `qa/postman/KartuNamaDigital-Shared-Hosting-Staging.postman_environment.json`: empty-secret staging environment template.

## Frontend runtime foundation

- `frontend/index.html`: mobile-first bright-monochrome landing page with the
  approved ten-section marketing flow.
- `frontend/blog/satu-link-untuk-identitas-profesional/index.html`: indexable
  long-form article supporting the landing-page message.
- `frontend/blog/cv-resume-builder/index.html`: indexable Resume Enhancement
  Pro article with locked benefit, SLA, revision, and retention facts.
- `docs/references/resume-enhancement-pro-reference.png`: approved monochrome
  visual reference for the Resume Enhancement article.
- `frontend/assets/css/marketing-monochrome.css`: scoped landing/article visual,
  responsive, and reduced-motion contract without raster UI screenshots.
- `frontend/pages/public/home.js`: accessible mobile navigation behavior shared
  by the landing page and article.
- `frontend/assets/css/site-theme.css`: global monochrome Light/Dark palette for
  public, legal, auth, member, and admin shells.
- `frontend/assets/js/site-theme.js`: early theme bootstrap, accessible
  first-visit chooser, persistent non-sensitive preference, and global toggle.
- `frontend/tests/site-theme-contract.test.js`: global shell coverage,
  preference safety, palette, and reduced-motion regression contract.
- `frontend/.htaccess`, `frontend/public-card/index.html`, `frontend/pages/public/card.js`, and `frontend/services/public-card-presenter.js`: canonical root-slug routing and safe public theme composition.
- `frontend/components/card-themes/`, `frontend/assets/css/card-themes.css`, and `frontend/services/card-theme-renderer.js`: ten plan-authorized but plan-label-free card compositions with adaptive typography, responsive spacing, and graceful empty fields.
- `frontend/tests/card-theme-template.test.js`: locked 10-theme allocation, orientation, field, logo-tier, no-label, and responsive CSS contract.
- `frontend/package.json` and `frontend/package-lock.json`: deterministic static frontend scripts, install, tests, and audit metadata.
- `frontend/config/app-config.js`: public runtime configuration defaults.
- `frontend/services/api-client.js`: cookie, CSRF, timeout, refresh, and API error boundary.
- `frontend/config/runtime-config.js`: static preview API base runtime override point.
- Vercel deployment configuration was retired after Phase 8E; Phase 7 Vercel reports remain historical evidence only.
- `frontend/services/auth-service.js` and `frontend/services/starter-service.js`: Phase 6B REST bindings.
- `frontend/register/`, `frontend/login/`, `frontend/verify-email/`, `frontend/forgot-password/`, `frontend/reset-password/`, `frontend/create/`, `frontend/starter/manage/`: Phase 6B static Auth/Starter pages.
- `frontend/app/` and `frontend/pages/app/`: Phase 6C authenticated dashboard shell and app navigation.
- `frontend/app/card/identity/`, `frontend/app/card/contact/`, and `frontend/pages/app/card-editor.js`: Phase 6D card identity/contact editor.
- `frontend/app/card/settings/` and `frontend/pages/app/card-settings.js`: Phase 6E slug, publish, and QR panel.
- `frontend/app/card/design/` and `frontend/pages/app/card-design.js`: Phase 6F theme picker and design panel.
- `frontend/app/card/social/`, `frontend/app/card/catalog/`, and `frontend/pages/app/card-content.js`: Phase 6G social/catalog editor.
- `frontend/app/billing/` and `frontend/pages/app/billing.js`: Phase 6H billing/payment UI.
- `frontend/app/account/` and `frontend/pages/app/account.js`: Phase 6I account security UI.
- `frontend/validators/` and `frontend/components/forms/`: shared frontend form validation and accessible error helpers.
- `frontend/services/i18n.js` and `frontend/locales/`: safe text localization.
- `frontend/assets/css/app.css`: focus, skip-link, and reduced-motion baseline.
- `frontend/components/app-shell.js` and `frontend/app/feedback/`: consistent authenticated navigation, restrained transitions, and CSRF-protected feedback intake.
- `frontend/assets/favicon.svg`: code-native brand favicon for landing/dashboard.
- `frontend/tests/landing-visual-seo.test.js`: landing SEO/visual and dashboard-shell regression contract.
- `frontend/tests/`: native Node frontend security and integration-contract tests.
- `backend/src/modules/account/`: current user `/me` API contract implementation.
- `backend/src/modules/plans/controllers/plan-catalog-controller.ts`: public read-only `/api/v1/plans` controller.
- `backend/src/modules/plans/repositories/plan-catalog-repository.ts`: public plans catalog repository port.
- `backend/src/modules/plans/repositories/mysql-plan-catalog-repository.ts`: parameterized MySQL implementation for active public plans.
- `backend/src/modules/plans/routes/plan-router.ts`: public plans route mount for OpenAPI parity.
- `backend/tests/Unit/plan-catalog-http.test.ts`: regression test for unauthenticated public plans catalog access.
- `backend/src/modules/starter/repositories/mysql-starter-repository.ts`: anonymous Starter persistence, including immediate public `published` status and manage-token rotation.
- `backend/src/modules/cards/repositories/mysql-card-repository.ts`: owned and public card persistence, including anonymous Starter-compatible public lookup.
