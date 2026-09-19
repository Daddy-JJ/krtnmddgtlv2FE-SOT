# Frontend Decision Log

Only approved decisions that apply to this frontend repository belong here.
Historical decisions that remain relevant are summarized in this canonical log.

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

Legacy documents were previously preserved as a read-only snapshot. They provided
provenance only and could not override canonical SOT.

## FE-D-021 — Consolidate documentation into canonical docs

Date: 2026-09-17
Status: Accepted

The legacy documentation snapshot is removed after its relevant decisions and
operational guidance were consolidated into the canonical `docs/` set. The
frontend repository has one active documentation source; no API, runtime, or
backend behavior changes.

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
Status: Superseded by FE-D-015 on 2026-09-11

Owner approved WhatsApp click-to-chat on public cards for Starter, Basic, and
Pro, superseding only the Pro-only WhatsApp CTA entitlement in the previous
card-capability decision. The frontend derives a non-persisted digits-only
`https://wa.me/62...` shortlink from a valid saved Indonesian mobile number.
Local numbers beginning with `0`, country-code numbers beginning with `62`, and
display formatting are normalized; invalid or absent numbers keep the CTA hidden.
No endpoint, request payload, database field, or card artwork contract changes.

## FE-D-013 - Flexible Starter identity and optional website

Date: 2026-09-09
Status: Accepted

The Starter form keeps first name required while making Mr/Mrs/Ms and last name
optional. The frontend combines those visible parts into the existing
contact.fullName contract. Website is optional and is sent as an empty string
when omitted. The user-facing mobile label is Nomor handphone.

## FE-D-014 - Direct Starter Signup after email handoff

Date: 2026-09-09
Status: Accepted

A new Starter user is not presented with Login versus Signup after opening the
email management link. After the one-time token exchange, the frontend removes
the fragment and opens Signup directly. The backend-authorized signup context
provides the card email, which remains read-only and is never put in URL or Web
Storage. Login appears only as recovery after EMAIL_ALREADY_EXISTS.

## FE-D-015 - Node backend, native QR, seven-letter Starter slug, and Pro WhatsApp

Date: 2026-09-11
Status: Accepted

Node.js `>=22.18 <23` with Express is the official backend. PHP/Laravel as an
active backend and Endroid QR are superseded. Starter public slugs are exactly
seven ASCII letters, case-sensitive, generated and enforced by the backend, and
not editable by Starter. QR PNG is rendered by the Node backend from the
canonical public URL.

The new locked membership baseline supersedes FE-D-012: WhatsApp CTA is now
Pro-only and the public frontend consumes the safe backend-derived URL. The
supplied baseline also says Starter has no login/member area while editing is
allowed; this conflicts with FE-D-002 and the implemented Signup/claim flow.
That access-model item is `[Need More Information]`; existing secure claim and
authorization remain unchanged pending owner clarification.

## FE-D-016 - Anonymous Starter creation, account-bound management, and Midtrans gate

Date: 2026-09-12
Status: Accepted

The owner resolves the access-model question from FE-D-015: a new user may
create a Starter card without Login or Signup. An account is required only when
that user chooses to maintain or edit the created card; the user then creates a
Starter account and claims the specific card through the existing secure
email-handoff flow. This confirms FE-D-002 and FE-D-014 rather than creating an
anonymous edit path.

Membership checkout remains paused. It may be activated only after a later
explicit owner decision confirms that the Midtrans API integration is ready.
Until then, the frontend keeps checkout actions disabled, displays
`Under development`, and does not send payment-creation requests.

## FE-D-017 - WhatsApp CTA available to all tiers

Date: 2026-09-12
Status: Accepted

The owner reconfirms that WhatsApp click-to-chat is available for Starter,
Basic, and Pro. This supersedes FE-D-015's Pro-only WhatsApp entitlement while
preserving backend-derived, normalized wa.me URLs and frontend validation.

## FE-D-018 - Prefix-aware card display

Date: 2026-09-12
Status: Accepted

The card editor keeps Mr/Ms/Mrs as a separate optional prefix and keeps the
last name optional. The existing backend `contact.fullName` payload remains
unchanged for compatibility. Public card artwork displays the person's name
without the prefix and appends the corresponding optional gender symbol: Mr
uses `♂`, while Ms/Mrs use `♀`. Names without a recognized prefix display
without a symbol. The marker is rendered in parentheses, for example
`Arwan Prabowo (U+2642)` or `Sari (U+2640)` at the presentation layer.

## FE-D-019 - Verified account security UX

Date: 2026-09-12
Status: Accepted

The authenticated account page reads GET /me before enabling security actions.
When emailVerified is true, the page displays a verified status and hides OTP
verification/resend controls. If the profile is unverified, those controls
remain available with the backend-owned account email. Password-reset requests
use the same read-only profile email so a signed-in user cannot target another
address from this surface.

## FE-D-020 - Reset-only account settings surface

Date: 2026-09-12
Status: Accepted

The owner removes the email-status and OTP panels from `/app/account/`,
superseding the account-page presentation in FE-D-019. The page retains only
password reset, loads the current account through GET /me, and uses its
backend-owned email as a read-only reset destination. OTP verification remains
owned by the dedicated registration flow. No API endpoint, authentication
contract, or backend implementation changes.

## FE-D-021 - Foundations-inspired visual system pilot

Date: 2026-09-17
Status: Accepted

The owner approves an opt-in visual-system adapter inspired by Supertype
Foundations 0.2.5. The frontend remains static HTML, Vanilla JavaScript modules,
and Tailwind CSS 4; React, Next.js, and the upstream component runtime are not
introduced. Semantic tokens, typography, contrast, radius, shadow, and common
component primitives are reimplemented as scoped local CSS.

The first review gate covers /about/, /faq/, /login/, /app/, /app/account/,
and /admin/. Broader rollout requires owner approval after visual review. The
ten card-name designs, their theme registry, renderer, and public-card artwork
are explicitly excluded from this redesign. API contracts, business rules, and
backend ownership are unchanged.

The upstream reference is MIT-licensed and recorded in THIRD-PARTY-NOTICES.md.

## FE-D-022 - Foundations layout normalization and Contact alignment

Date: 2026-09-17
Status: Accepted

The owner approves a single spacing scale and explicit layout ownership for the
Foundations pilot. The scoped adapter now owns marketing containers and heroes,
auth spacing, application shell grid/gaps, and Super Admin panel spacing. Legacy
hero ornaments and accumulated padding are disabled only inside the adapter.

Contact joins About and FAQ in the marketing pilot so these related pages share
the same typography, component styling, container width, and vertical rhythm.
The ten card-name designs and public-card artwork remain excluded.

## FE-D-023 - Foundations editorial micro-polish

Date: 2026-09-17
Status: Accepted

The owner approves a compact editorial heading scale and a wider reading measure
for the Foundations marketing pilot. About, FAQ, and Contact retain the shared
spacing system while avoiding unnecessary three-line desktop headings. Legacy
panel corner bars are disabled inside the pilot adapter; public-card themes and
dynamic card artwork remain unchanged.

## FE-D-024 - Foundations typography and blocks recipe refactor

Date: 2026-09-18
Status: Accepted

The owner approves a focused refactor of the About, FAQ, and Contact marketing
recipes. The local scoped adapter adopts semantic display/lead roles, responsive
Card grids, and native HTML Disclosure for FAQ. This replaces route-local
utility-based heading scales and static FAQ panels on those three routes.

The scope does not introduce a React or Next.js runtime, external API changes,
or changes to public-card rendering. The ten card-name designs, their renderer,
and public-card artwork remain excluded.
## FE-D-025 - Foundations full-route rollout

Date: 2026-09-18
Status: Accepted

The owner approves rollout of the scoped Foundations adapter to every visible
frontend route shell. Marketing and blog routes use editorial type roles;
authentication, member workspace, and internal workspace use interface type
roles. The route shells keep their existing page controllers, API contracts,
authorization, and business behavior.

The ten card-theme templates, theme registry, renderer, and public-card artwork
remain explicitly excluded. Redirect-only compatibility routes remain functionally
unchanged and are not given presentation markup.
## FE-D-026 - Landing recipe normalization

Date: 2026-09-18
Status: Accepted

The owner approves a landing-only normalization pass. The legacy landing
illustration markup remains in place, while its spacing, reading measure,
headline scale, surfaces, footer, and light/dark values are routed through the
Foundations role tokens. The landing page remains static HTML with its existing
navigation, content hydration, and API contract unchanged.

The ten card-name designs, public-card artwork, and all other route-specific
business behavior remain outside this decision.
## FE-D-027 - Concise landing blocks and cross-page design audit

Date: 2026-09-18
Status: Accepted

The owner requests merging benefits with the profile introduction, and security
with the final CTA. Each pair becomes one responsive section. This supersedes
FE-D-026 only where it retained the browser/security/person illustrations in
those sections. All 25 existing admin-managed text fields remain represented;
no API or content schema changes are introduced.

Other pages receive a consistency audit with evidence and follow-up priorities,
not an unbounded redesign. The ten card designs remain excluded. The canonical
audit is in `REVIEW-REPORT.md`; passing adapter-presence tests does not certify
complete visual alignment.

## FE-D-028 - Approved cross-page Foundations normalization

Date: 2026-09-19
Status: Accepted

The owner approved continuing the redesign across remaining non-card pages.
This expands FE-D-027's audit-only boundary for those pages. Shared typography,
scope, panels, controls, navigation and responsive spacing are normalized in
the existing adapter, without a framework or API change. Fonts intentionally
use local system stacks; no remote font dependency is implied.
Ten public-card designs remain excluded. Browser fixtures provide presentation
evidence only; real authenticated workflows still require UAT.

## FE-D-029 - Production browser API hostname routing

Date: 2026-09-19
Status: Accepted

Production browser hosts `kartunamadigital.id`, `www.kartunamadigital.id`, and
`krtnmdgtlv2-fe-ten.vercel.app` use the injected production API base
`https://api.kartunamadigital.id/api/v1`. Localhost continues to use
`http://127.0.0.1:3000/api/v1`. This supersedes FE-D-006 only for the browser
routing path: the Vercel Function remains a fail-closed same-origin fallback,
with its upstream timeout no shorter than the 30-second Starter create timeout.

## FE-D-030 - Privacy-scoped Vercel Web Analytics

Date: 2026-09-19
Status: Accepted

Vercel Web Analytics is injected at static-build time only into the ten
indexable marketing pages in the sitemap. The integration uses no analytics
cookie, removes query strings and URL fragments before sending an event, and
excludes authentication, Starter form, member, internal workspace, and dynamic
public-card routes. This keeps one modular integration owner without copying
tracking markup across source pages.

## Decision change procedure

A superseding entry must identify the decision being changed, describe migration
impact, update every affected canonical document/test, and receive explicit
product-owner approval. Do not rewrite accepted history to simulate a new choice.
