# SSOT Manifest

## Product truth
- Vision: `docs/01-VISION.md`
- Business: `docs/02-BUSINESS-RULES.md`
- Membership: `docs/03-MEMBERSHIP-MATRIX.md`
- Scope: `docs/04-PRD.md`, `docs/05-SCOPE-AND-NON-GOALS.md`

## Data truth
- Domain: `docs/13-DATA-DOMAIN-MODEL.md`
- Fields: `docs/14-DATABASE-DICTIONARY.md`
- VCF: `docs/15-VCARD-VCF-SPEC.md`
- Physical reference: `database/schema-reference.sql`

## API truth
- Human: `docs/16-API-CONTRACT.md`
- Machine: `openapi/openapi.yaml`
- Errors: `docs/17-ERROR-CATALOG.md`

## Engineering truth
Backend/frontend subfolders, security baseline, test strategy, UAT, and Definition of Done.

Approved reconciliation record: `docs/36-CHANGE-REQUEST-CR-001-SOT-RECONCILIATION.md`.

Implementation status and Phase 1 evidence: `STATUS.md` and `docs/37-PHASE-1-FOUNDATION-REPORT.md`.

Backend/API readiness and QA/security execution: `docs/38-BACKEND-API-READINESS-REPORT.md`, `docs/39-QA-SECURITY-EXECUTION-PLAN.md`, and `qa/postman/`.

Accepted backend runtime migration authority and evidence: `docs/40-CHANGE-REQUEST-CR-002-NODE-EXPRESS-MIGRATION.md`, `docs/41-PHASE-1M-NODE-EXPRESS-REPORT.md`, and D-031 through D-036. PHP/Composer runtime files were removed after acceptance.

Phase 2A Auth security foundation evidence: `docs/42-PHASE-2A-AUTH-SECURITY-FOUNDATION-REPORT.md` and D-037.

Phase 2B Auth/OTP API evidence: `docs/43-PHASE-2B-AUTH-API-REPORT.md` and D-038.

Phase 2C Starter workflow evidence: `docs/44-PHASE-2C-STARTER-WORKFLOW-REPORT.md` and D-039.

## Rendering truth
QR: `docs/backend/09-QR-CODE-SPEC.md`; vCard: `docs/backend/10-VCARD-RENDERING.md`; impact: `docs/31-QR-UX-ADMIN-IMPACT.md`.

## URL truth

- Public URL and slug rules: `docs/backend/18-SLUG-URL-SPEC.md`
- Membership access: `docs/03-MEMBERSHIP-MATRIX.md`
- API: `openapi/openapi.yaml`

## Payment truth
Midtrans: docs/backend/19-MIDTRANS-INTEGRATION-SPEC.md; subscription: docs/backend/20-SUBSCRIPTION-LIFECYCLE.md; API: openapi/openapi.yaml.

## Theme truth

- Catalog and field mapping: `docs/33-CARD-THEME-CATALOG.md`
- Backend access/selection: `docs/backend/22-THEME-ENGINE-SPEC.md`
- User editor: `docs/frontend/12-CARD-THEME-EDITOR.md`
- Frontend registry: `frontend/config/theme-registry.json`
- Database seed: `database/seeds/002-card-themes.sql`

## Email truth
SMTP architecture, hash-only OTP lifecycle with immediate non-durable delivery, non-OTP transactional outbox, cPanel setup, and OpenAPI are defined in the v2.5 email documents and D-030.
