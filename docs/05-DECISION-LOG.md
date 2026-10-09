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

## FE-D-031 - Super Admin operations command center

Date: 2026-09-20
Status: Accepted

The owner approves a frontend-only Super Admin operations pass against the
completed backend contract. The existing shared controller remains the DOM
owner, while one admin operations service owns endpoint transport. The workspace
adds a dedicated Feedback Inbox, explicit command-center statistics, final card
ownership interventions, and separate Reports, System, and Security surfaces.

The navigation is grouped by operational responsibility without changing
existing URLs. Mutations use credentialed access-context CSRF, reason,
confirmation, recent-auth handling, and double-submit protection. Admin response
data is not persisted in Web Storage, and generic rendering is denylisted
against internal IDs, tokens, hashes, secrets, and private paths. Backend and
database changes are outside this decision.

## FE-D-032 - Homepage preview for the Inovasia showcase

Date: 2026-09-29
Status: Accepted

The owner confirmed that the alumni showcase should embed the homepage, not an
individual card. `/preview/` serves the existing homepage shell with a CSP
allowlist for the Inovasia apex and `www` origins, noindex response policy, no
first-visit theme chooser, and no analytics page-view event. A top-level visit
to the same URL redirects to `/`, so Inovasia's shared iframe/Kunjungi URL can
be changed to `/preview/` without sending visitors to a preview URL. The root
homepage retains frame denial; `/preview/{slug}` remains available for public
card previews. The Inovasia `deployment_url` update and frontend deployment are
external release steps, not changes to backend or database contracts.

## FE-D-033 - Allow the existing homepage URL in the Inovasia iframe

Date: 2026-09-29
Status: Accepted; supersedes the root-frame-denial and external-URL-change
parts of FE-D-032.

The owner cannot change the showcase's stored URL on Inovasia. Its iframe uses
the existing homepage `/`, so that route now omits `X-Frame-Options` and allows
only the Inovasia apex and www origins plus self through HTTP CSP
`frame-ancestors`. All other non-preview routes retain frame denial. A framed
homepage skips the first-visit theme chooser and analytics page view, while
top-level visitors retain the normal theme choice and indexable canonical page.
The `/preview/` and `/preview/{slug}` routes remain available but are not
required for the current showcase. This is a frontend hosting exception, with
no backend/database or Inovasia-side write. Deployment and live header/iframe
verification remain pending.

## FE-D-034 - Duitku POP compatibility with checkout still paused

Date: 2026-10-02
Status: Accepted for frontend compatibility; checkout activation NOT approved.

Owner handover selects Duitku POP browser redirect as the sole new checkout
provider, superseding FE-D-016's Midtrans readiness dependency only. Annual tier
rules, server price/entitlement authority and the checkout pause remain.
Implement capabilities, strict redirect checks, minimal user-scoped intent
metadata, owned result lookup and bounded manual reconciliation. SessionStorage
mirrors the intent; the same non-secret fields in IndexedDB under Web Locks
coordinate tabs through ambiguous outcomes. Logout/user changes clear metadata;
same-user re-authentication preserves the intent and invalidates old controllers.
Historical provider labels remain intact; no legacy fallback or replacement order.
No gateway SDK, merchant credentials, new CSP provider allowance or callback is
introduced. Existing API client remains transport owner without POST replay.
Backend deployment/migration/sandbox/UAT are separate release responsibilities.
Both backend capability and a separate frontend release decision are required;
the frontend release constant remains false in this implementation.

## FE-D-035 - Remove unused Midtrans frontend compatibility

Date: 2026-10-02
Status: Accepted; supersedes historical-provider UI preservation in FE-D-034.

Owner confirms there have been no Midtrans transactions and approves removing
its frontend-specific labels, fixtures and error handling. This is owner-provided
context, not a production database audit. Duitku history and backend refund states
remain supported. Unknown providers still fail closed; HTTP 410 uses generic
support guidance without creating a replacement order. Accepted historical
decisions remain in this log. No backend/database change or checkout activation
is authorized by this cleanup.

## FE-D-036 - Public merchant prices and support information

Date: 2026-10-03
Status: Accepted for frontend publication only; sandbox activation NOT approved.

Owner approves public homepage product descriptions and IDR prices: Starter
free, Basic Rp55.000/365 days, Pro Rp97.000/365 days, and Basic to Pro Rp55.000.
Display support@kartunamadigital.id, 0813 2821 9697, and the owner-provided
Sentra Timur Residence business address on homepage/Contact. Keep tier benefits
aligned with the product matrix, including WhatsApp for all tiers. Static HTML
owns these facts, not optional landing CMS wording. This confirms informational
prices without changing backend amounts, billing rules or entitlement authority.
Registration is not checkout. FE-D-004/FE-D-034 checkout pause remains intact;
no sandbox/production activation, backend/database change or deployment is approved.

## FE-D-037 - Restricted shared-database sandbox alignment

Date: 2026-10-04
Status: Accepted for frontend alignment only; checkout activation NOT approved.

Owner handover records backend `2f24a89` restricting sandbox checkout to approved
dummy-user UUIDs while using the production database. Membership/credentials
stay backend-only. Frontend capabilities are account-scoped, fail closed and
remain subordinate to PAYMENT_CHECKOUT_RELEASED=false. Show sandbox labels and
shared-database benefit risk, clear billing on auth/user changes, and distinguish
PAYMENT_SANDBOX_FORBIDDEN from CSRF/auth failure without mutation replay.
Admin Reports uses only backend productionRevenue for gross revenue, while
provider/environment/status/currency totals remain separate. No frontend list,
admin-role exemption, production checkout, real transaction, backend/database
mutation, deployment or commit/push is authorized. Sandbox/UAT and activation
remain separate owner decisions; this does not supersede FE-D-034's pause.

## FE-D-038 - Explicit Starter CTA for unpaid account-first users

Date: 2026-10-04
Status: Accepted for frontend UX; checkout remains paused.

Owner confirmed first-card PAID_ENTITLEMENT_REQUIRED after Basic registration
and approved an explicit CTA rather than automatic navigation. If there are no
owned cards and no active Basic/Pro subscription, offer `Mulai dengan Starter`
at /create/ and disable paid-card save. Preserve inputs and remind users to copy
them before following the existing email management/verification/claim journey.
Registration intent grants no entitlement. Claimed Starter editing remains
available without subscription. Failed entitlement reads fail closed, and paid
creation stays backend-controlled. No data transfer, backend/database edit,
payment activation, deployment, commit or push is authorized.

## FE-D-039 - Confirmed Starter recovery by verified account email

Date: 2026-10-04. Status: Accepted by owner; frontend consumes local backend
recovery contract. Owner approved verified-email candidate lookup and explicit
claim confirmation after the empty-dashboard investigation. Backend owns
matching, eligibility, locking, one-card limits, revocation and audit. Frontend
shows only minimal candidate metadata and never auto-claims on OTP/login/list.
Existing management-token claim remains unchanged; cross-device recovery does
not depend on browser-stored management credentials. Hosting/UAT must be
verified separately, backend first. Checkout remains paused.

## FE-D-040 - Restricted sandbox-only frontend activation

Date: 2026-10-04. Status: Accepted by owner. Supersedes the sandbox-only pause
in FE-D-034/FE-D-037; production remains paused. Owner confirms the designated
verifier account is verified, has a claimed card and is backend-allowlisted.
Frontend has no account email/UUID allowlist, role override, keys or merchant API.
Permit only valid enabled Duitku sandbox capabilities using a shared gate in
UI/service. Reject enabled production capabilities and mismatched checkout or
history redirect environments. Shared-database benefit warning remains visible.
No invoice, payment simulation, backend write, commit/push or deploy in this task;
real sandbox UAT requires separate authority and evidence. Source approval alone
does not prove backend flags, credentials or provider connectivity on hosting.

## FE-D-041 - Production checkout source approval

Date: 2026-10-09. Status: Accepted by owner for frontend patch and local QA only.
Owner reports Duitku production merchant approval and credentials available, then
approves the proposed production frontend patch, SOT and regression tests.
Supersedes the production source pause in FE-D-004/FE-D-034/FE-D-040; accepted
history and separate restricted sandbox authorization remain intact.

Set PAYMENT_CHECKOUT_RELEASED=true; valid enabled per-account backend
capabilities are still mandatory for UI, service and same-environment history
redirects. Failed/malformed/disabled capabilities close checkout. Production
CTA reads `Bayar melalui Duitku`; sandbox keeps its test label/shared-DB warning.
Synchronize badges/aria labels/lock/notify states and remove unconditional
checkout-paused claims from public/member copy without promising availability.
Retain cookie/CSRF, UUID idempotency, no automatic POST replay, strict environment
URL allowlist and backend-only paid entitlement. Prices/transitions unchanged.

No backend/database/hosting edit, commit/push, deploy or real invoice/payment is
authorized. Deploy backend compatible with checkout disabled before frontend;
hosting activation and paid UAT require separate owner instructions. If UAT must
be account-restricted, backend needs a production gate; sandbox allowlist does
not apply. Merchant approval is owner-reported, not evidence of deployed
credentials, valid callback, exactly-once activation or browser/provider UAT.

## FE-D-042 - Pending payment context remediation

Date: 2026-10-09. Status: Accepted by owner after read-only investigation.
Scope: frontend patch, regression QA and cross-page recheck; commit/push after
successful checks. No backend/database mutation, hosted transaction or manual
deployment authorized. Preserves FE-D-041 release gates and all payment evidence.

Old sandbox pending can block production checkout; classifying it as a malformed
response is misleading. Use shared provider/environment/plan classification,
block incompatible replacement orders, retain manual status/support actions and
strict redirect validation. Never bind a history/409 invoice to an unrelated
UUID intent; never auto-expire an order or retry POST. Result pages resolve a
different return-order hint only through owned history/detail and retain other
pending invoices. Hosted stale-invoice resolution belongs to backend operations
and requires separate authorization. Prices and entitlement rules unchanged.

## Decision change procedure

A superseding entry must identify the decision being changed, describe migration
impact, update every affected canonical document/test, and receive explicit
product-owner approval. Do not rewrite accepted history to simulate a new choice.
