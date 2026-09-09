# Frontend Decision Log

Only approved decisions that apply to this frontend repository belong here.
Historical monorepo decisions remain in `docs/_legacy-sot/` without precedence.

## FE-D-001 — Frontend-only SOT

Date: 2026-09-01  
Status: Accepted

The SOT in this repository governs only frontend code, UX, static deployment,
and the API contract consumed by the frontend. Backend implementation, database,
OpenAPI authority, and server operations remain in a separate repository.

## FE-D-002 — Authenticated Starter claim before editing

Date: 2026-09-01  
Status: Accepted

Starter creation remains available without login. Editing is unavailable to an
anonymous visitor. The user must Login or Signup, verify the account when required,
and claim the specific card before editing it.

## FE-D-003 — Resume source is DOCX-only, maximum 10 MB

Date: 2026-09-01  
Status: Accepted

Resume Enhancement accepts one Microsoft Word `.docx` source file up to 10 MB.
PDF source upload is not part of launch scope. Official output remains DOCX.

## FE-D-004 — Membership checkout remains paused

Date: 2026-09-01  
Status: Accepted

Checkout remains disabled until a later product decision resumes it. During the
pause, UI note must use `Under development`. Benefit and price information may be
visible, but the browser must not create checkout/payment requests.

## FE-D-005 — Mandatory first-visit Light/Dark chooser

Date: 2026-09-01  
Status: Accepted

A visitor without a stored website-theme preference must be shown an accessible
Light/Dark chooser. The selected non-sensitive value may be stored as
`knd.theme.preference`. Card artwork theme remains independent.

## FE-D-006 — Vercel frontend and external shared-hosted backend

Date: 2026-09-01  
Status: Accepted

Vercel is the canonical frontend host. Backend lives in a separate repository on
shared hosting. Browser traffic uses same-origin `/api/v1` through the Vercel
Function proxy, which reads a stable HTTPS `BACKEND_API_BASE_URL`.

## FE-D-007 — Indonesian-only launch

Date: 2026-09-01  
Status: Accepted

Bahasa Indonesia is sufficient for launch. English UI and a language switcher are
deferred. Existing English locale resources may remain dormant scaffolding.

## FE-D-008 — Preserve legacy SOT as read-only archive

Date: 2026-09-01  
Status: Accepted

Legacy documents are preserved at `docs/_legacy-sot/` with their relative paths
and checksums. They provide provenance only and cannot override canonical SOT.

## FE-D-009 — Explicit static deployment allowlist

Date: 2026-09-01  
Status: Accepted

Vercel serves `dist/`, not repository root. A deterministic build copies only
runtime files; docs, tests, governance, and repository metadata stay private.

## FE-D-010 - Super Admin transactional email template management

Date: 2026-09-06
Status: Product direction accepted; Stage 1 specification/handoff authorized.
Historical Stage 1 status: editor and backend template APIs were not implemented.

Owner approved the plan after requesting editable welcome wording and all
existing user email templates in Super Admin. Extend the existing email area,
retain Mail Outbox, and use structured content/formatting with draft, preview,
dummy test-send, explicit publication, history, and restoration to draft.

This extends the locked internal-workspace scope, without superseding FE-D-001
(frontend-only), FE-D-002 (verified claim before editing), FE-D-004 (checkout
paused), or FE-D-007 (Indonesian launch). Existing email/token/security policies
are not editable business rules in the template editor.

Stage 1 inventory identifies seven template entries, including three existing
Resume retention keys. The specification and proposed API operations live in
`06-EMAIL-TEMPLATE-MANAGEMENT.md`; `EMAIL-TEMPLATES-BACKEND-HANDOFF.md` is the
separate backend work brief. Exact schemas/paths/limits are engineering proposals
pending backend confirmation, not approved existing endpoints. No backend edit,
database change, real email send, or later implementation stage is authorized
by this Stage 1 handoff alone.

Subsequent implementation record (2026-09-06): owner separately approved backend
Stage 2 activation and frontend Stages 3-4. Migration 010 and the local backend
feature flag are active. The Super Admin editor is implemented at
`/admin/mail/templates/`; no mailbox UAT email was sent during implementation.

## FE-D-011 - Retire Resume Quality Reviewer role

Date: 2026-09-06
Status: Accepted

Frontend follows the backend role consolidation documented in backend
`docs/ROLES.md`. The only canonical Resume administration role is
`resume_service_admin`; it owns queue, assignment, quality review, final release,
specialist management, and audit access. `resume_quality_reviewer` is retired and
must not appear in role choices or receive privileged navigation from an old
claim. Backend permissions and request-state checks remain authoritative.

## FE-D-012 - WhatsApp CTA available to all tiers

Date: 2026-09-09
Status: Accepted

Owner approved WhatsApp click-to-chat on public cards for Starter, Basic, and
Pro, superseding only the Pro-only WhatsApp CTA entitlement in the previous
card-capability decision. The frontend derives a non-persisted digits-only
`https://wa.me/62...` shortlink from a valid saved Indonesian mobile number.
Local numbers beginning with `0`, country-code numbers beginning with `62`, and
display formatting are normalized; invalid or absent numbers keep the CTA hidden.
No endpoint, request payload, database field, or card artwork contract changes.

## Decision change procedure

A superseding entry must identify the decision being changed, describe migration
impact, update every affected canonical document/test, and receive explicit
product-owner approval. Do not rewrite accepted history to simulate a new choice.
