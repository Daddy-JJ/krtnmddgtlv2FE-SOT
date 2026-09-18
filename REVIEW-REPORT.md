# Frontend SOT Reintegration Review

Review date: 2026-09-11

Status: **LOCAL REINTEGRATION VALIDATION COMPLETE; PRODUCTION READINESS PENDING EXTERNAL EVIDENCE**

## 2026-09-19 - SEO follow-up

Updated ten sitemap pages: unique descriptions with natural kartu nama digital
context, distinct titles/intents, social metadata and structured data.
Home/About/FAQ headings and blog internal links improved without layout changes.
FAQ now correctly states account/claim requirements and all-tier WhatsApp;
CV upload copy now matches DOCX-only 10 MB. Eight admin resume redirect shells
were missing robots metadata and now explicitly use noindex, nofollow.
No backend or card-theme changes. The existing card metadata controller was
audited, not rewritten; JS-only personalization remains a crawler limitation.

Evidence: tests/seo-standard-pages.test.js and tests/landing-visual-seo.test.js.
Full npm.cmd run qa passes: 162 build files, 159 tests. No ranking, production
indexing or Search Console verification is claimed. CMS landing text may
override fallback headings and needs editorial alignment before release.

Local HTTP smoke: all ten public pages returned 200 with updated titles.
Landing browser checks passed (32 samples/checks covering responsive layout,
themes and existing interactions). Temporary evidence:
`C:/Users/DaddyJJ/AppData/Local/Temp/knd-layout-HCJoUQ/report.json`.

## 2026-09-19 - Approved cross-page remediation follow-up

The owner expanded the prior audit into implementation. Shared corrections:

- Tokens/type layers: explicit system fonts, compact page/section/card scales,
  semantic legacy-color bridge, consistent html scope.
- Primitives: primary/secondary actions, neutral admin navigation, theme chooser,
  semantic panels, form sizing, article/resume spacing and mobile containment.
- Member account/social/catalog/settings and dynamic email editor reuse panels.
- Admin navigation exposes aria-current without changing route/API behavior.

Evidence: `tests/foundations-ui-pilot.test.js`,
`tests/app-shell-feedback.test.js`, the three Foundations CSS layers,
`components/app-shell.js`, `pages/admin/email-templates.js` and
`pages/admin/super-admin-workspace.js`. Full QA builds 162 files and passes
157 tests. Browser inspection covers 51 route shells at 320/1440px in Light/Dark
(204 states), using intercepted API fixtures and no backend mutations.

Final browser rerun: zero page-level horizontal overflows, zero unexpected
redirects; first-visit chooser open. Account and email-editor screenshots were
inspected after the last CSS correction. Local temporary evidence:
`C:/Users/DaddyJJ/AppData/Local/Temp/knd-all-ui-xexcVF/report.json` and adjacent
screenshots (not committed; temporary files may be removed by the OS).
`git diff --check` passed. Card-template/registry/renderer diff is empty.

Limitations: this is not live authentication, SMTP, payment or database E2E.
Some unavailable detail fixtures intentionally exercise error states. Full
real-data UAT and owner visual approval remain pending. No backend or ten-card
design changes, commit or push are part of this continuation.

## 2026-09-18 - Landing consolidation and Foundations consistency audit (historical)

Scope: implement the two requested landing merges; audit other routes without
changing their UI or business behavior. Earlier reintegration results below are
historical, not proof that every current page is visually aligned.

Implemented:

- `index.html`: benefits + profile introduction now share one section at
  `#fitur`; four compact cards replace the repeated browser illustration/list.
- Security + final CTA now share one closing panel. Three security bullets
  retain the five original security points without the oversized illustrations.
- `assets/css/foundations-primitives.css`: landing-scoped token-based surfaces,
  compact heading roles, 4/2/1-column benefits, and stacked mobile closing panel.
- Fixed a separate landing footer contrast defect found during the audit:
  legacy white branding/grey links remained on an inverse light footer in Dark
  mode. Descendants now use the footer's semantic foreground.
- All 25 admin-editable landing text hooks, CTA destinations, navigation,
  SEO, page controller, and API contract remain intact.

Audit method and limits:

- Source inventory: all 51 visible non-card route shells load the three adapter
  stylesheets and opt into its scope. This confirms coverage, NOT visual completion.
- Chrome headless on localhost: landing at 1440, 768, 390, and 320 CSS px in
  Light and Dark; screenshots of both merged blocks inspected at desktop/mobile.
- Additional computed-style samples at 1440 px in both themes: About, FAQ,
  Contact, Privacy, the one-link blog, Login, Register, Create, Account, Billing,
  and Identity. These are presentation checks, not authenticated E2E tests.
- All API requests were intercepted with isolated responses; protected page
  controllers were disabled while the shared member shell still mounted.
  No account, card, email, payment, or backend data was created or modified.
- The 10 card designs and public-card renderer remain explicitly excluded.

| Priority / status | Routes affected | Evidence and correction needed |
|---|---|---|
| Done, requested blocks | `/` | Six main sections instead of eight; one benefits/profile block and one security/CTA block. Footer contrast also corrected. |
| P1, confirmed | Member routes using `components/app-shell.js`, including `/app/account/`, `/app/billing/`, `/app/card/identity/` | Computed Dark-mode logout has white background, light text `rgb(228,227,224)`, 0px radius, monospace and uppercase. Legacy `site-theme.css` rules for `.app-shell__logout` still win. Map logout/menu/sidebar actions to one semantic secondary-button role. |
| P1, confirmed scope mismatch | `/app/`, `/app/account/` | Adapter class is on body, unlike other routes on html. Account root rem remains 16px and H1 measures 52px versus Identity 48.75px. Normalize scope before tuning shared sizes; do not merely add more overrides. |
| P2, confirmed | First-visit chooser across all 51 adapted shells | Runtime uses `.site-theme-chooser__choice`, but adapter targets unused `.theme-choice__button`. Browser confirms 0px corners and legacy dark border. Align actual chooser selectors, including hover/focus, without touching chooser behavior or public-card styling. |
| P2, confirmed type-scale gap | `/about/`, `/faq/`, `/contact/`, legal pages and both blogs; auth/member interface headings | At 1440px, sampled editorial H1 is still 63.75px from the adapter; interface H1 is 48.75px (Account 52px). This is NEW adapter scale, not an old CSS/cache error. Define smaller page-title versus display-title roles rather than applying one display scale everywhere. |
| P2, confirmed font fallback | All adapted shells | Tokens name Ubuntu Sans / Average, but source has no font-face or font stylesheet loading. Chrome platform-font inspection on Identity reports Segoe UI, not Ubuntu Sans. Decide explicit licensed local font assets or document intentional system fallbacks. |
| P2, source gap; remaining browser states pending | `/blog/satu-link-untuk-identitas-profesional/`, `/blog/cv-resume-builder/` | Article/Resume blocks retain `mono-*` layout and `--mono-*` colors; landing-only token mapping does not cover them. Some surfaces adapt but inherited colors still mix. Audit paragraph/link/hover contrast and article spacing before a scoped article recipe pass. Do not infer unreadability solely from a container's inherited color. |
| P2, source-confirmed cascade risk | `/app/card/settings/` and shared form/actions across member/auth pages | `[data-publish]` uses `bg-teal-700`, absent from the adapter's primary button utility list; legacy dashboard rule still owns it. Inventory dynamic controls too, then replace utility matching with shared semantic action classes. |
| Partial, sampled layout aligned | About, FAQ, Contact | Cards/disclosures and eyebrow roles are active; panel light/dark backgrounds match tokens and sampled desktop has no horizontal overflow. Remaining title/font/chooser issues above prevent a blanket complete verdict. |
| Partial, source inventory only beyond samples | `/privacy/`, `/terms/`, `/cookies/`, `/refund/`; `/login/`, `/register/`, `/forgot-password/`, `/reset-password/`, `/verify-email/`, `/create/`, `/starter/manage/` | Shared adapter is present. Privacy/Login/Register/Create sampled; remaining routes need browser review of errors, disabled controls, long text, and mobile. Do not equate legacy class names with a defect when a correct override exists. |
| Partial, source inventory only beyond samples | All `/app/card/*`, `/app/resume-enhancement/*`, `/app/feedback/`, dashboard and billing/account | Shared-shell defects apply; keep design previews isolated. Billing notify surface sampled in Dark mode correctly resolves to the new dark card token, so the old white-panel screenshot is not assumed to remain current. |
| Pending authenticated visual QA | All active `/admin/*` and `/specialist/*` | CSS loading and generated workspace ownership inspected. Dynamic tables, empty/error/loading states, dialogs, and mail-template editor require authenticated fixtures/UAT; not certified visually by this audit. |
| Excluded intentionally | `/{slug}`, `public-card/`, 10 card templates and redirect-only shells | No design changes. Redirect-only routes have no visual surface to migrate. |

Next correction order: member contrast/scope first; shared chooser and action
roles second; page-title/font roles third; article/legal/onboarding recipes fourth;
authenticated admin/specialist state review last. Test each batch in both themes,
at desktop/mobile widths, with keyboard focus and long/error/empty content.

Verification on 2026-09-18:

- `npm.cmd run qa`: PASS, build 162 runtime files, 155 tests passed.
- Focused landing/theme/content tests: 14 passed.
- Browser landing assertions: no horizontal overflow at all eight width/theme
  combinations; correct panel theme colors; footer brand/link contrast >= 4.5;
  mobile menu open/Escape close; all merged CMS titles hydrate; first-visit
  chooser still opens. Checks pass, but do not certify unrelated page styling.
- Local browser evidence: screenshots and `report.json` in
  `C:\Users\DaddyJJ\AppData\Local\Temp\knd-layout-qU0S77\`
  (temporary local artifacts, not deployment or repository files).
- No commit, push, backend change, or public-card artwork change in this task.

## Repository classification

Repository adalah static multi-page frontend, bukan monorepo lama. Backend berada
di luar repository dan hanya terhubung melalui API. Stack aktual adalah Vanilla
JavaScript ES modules, compiled Tailwind CSS, browser Fetch/DOM, Node tests, dan
Vercel Function proxy.

## Reintegration completed

1. Product owner menyelesaikan tujuh keputusan high-risk.
2. Deployment output dipindahkan dari root ke allowlisted `dist/`.
3. 162 dokumen legacy dan 12 governance snapshot dikarantina tanpa checksum
   mismatch.
4. Frontend-only SOT, Decision Log, arsitektur, membership contract, API consumer
   contract, dan deployment contract dibentuk kembali.
5. Security/runtime defect yang teridentifikasi diremediasi dan diberi regression
   coverage.
6. Checkout pause, first-visit Light/Dark, dan Indonesian-only launch diselaraskan
   dengan keputusan product owner.
7. Maps, derived WhatsApp guidance, unsaved theme preview, serta social/catalog
   create-list-delete dilengkapi dalam batas API aktif.
8. Preview theme, rule DOCX 10 MB, dan current-user lookup mempunyai satu owner;
   duplicate scaffold dan orphan terverifikasi dibersihkan.
9. Root governance, SOT kanonis, onboarding, security, dan status disinkronkan
   kembali terhadap implementasi aktual.
10. Final re-check memvalidasi source/configuration, dependency tree, module dan
    document references, static security, deployment boundary, build, serta test.

## Confirmed implementation strengths

- Broad public/auth/member/internal route coverage.
- Central API client dengan credentials, timeout, request ID, refresh, dan CSRF.
- Sepuluh template kartu beserta registry dan responsive renderer.
- Root public-card route, QR/vCard links, safe URL helpers, dan SEO coverage.
- Billing UI sudah fail-closed selama checkout paused.
- First-visit chooser, Indonesian-only runtime, Maps, dan unsaved form preview
  sudah memiliki contract coverage.
- Resume UI memakai satu shared validator DOCX maksimal 10 MB.
- Runtime module graph memeriksa broken import, orphan module, dan shared owner.
- Vercel dan fallback Apache menetapkan baseline browser security headers yang
  sama; session storage claim hanya menerima public ID tervalidasi.
- Test suite mencakup contract, security, accessibility, routing, themes, proxy,
  dan repository-local same-origin stack.

## Remaining API-bound scope

- Edit/reorder social links dan catalog memerlukan kontrak backend yang belum
  tersedia dalam frontend consumer contract.
- Logo upload/delete memerlukan endpoint multipart dan file-policy yang disetujui.
- Admin plan/payment/theme mutations dan QR regeneration menunggu kontrak method,
  path, payload, permission, dan audit backend.

Fitur tersebut tidak boleh dibuat melalui endpoint tebakan atau otoritas browser.

## Final local re-check

| Check | Result |
|---|---|
| JavaScript syntax | PASS — 95 `.js`/`.mjs` files |
| JSON configuration | PASS — 6 parsed files |
| Dependency tree | PASS — `npm ls --depth=0` clean |
| Documentation references | PASS — 16 local Markdown references, 0 missing |
| Runtime inventory | PASS — 60 route shells, 27 controllers, 10 card templates |
| Static security scan | PASS — no potential secret or unsafe runtime DOM sink found |
| Deployment controls | PASS — allowlisted `dist/`, fail-closed proxy, Vercel/Apache headers |
| Clean QA | PASS — 154 build files, 117/117 tests |

Phase 10 menemukan satu local deployment defect: security headers sebelumnya
hanya teruji pada fallback Apache. `vercel.json` dan regression test sekarang
memastikan baseline yang sama pada host kanonis. Re-check juga menambahkan test
bahwa `sessionStorage` hanya menerima public ID claim tervalidasi.

## External validation still required

- Vercel Preview dari exact commit/artifact yang akan dipromosikan.
- Same-origin `/api/v1` smoke terhadap backend staging HTTPS yang stabil.
- Cookie, CSRF, refresh/logout, Starter claim, public slug, QR/vCard, dan Resume
  upload/download dengan role dan data uji yang sah.
- Keyboard, mobile, reduced-motion, serta Android/iOS/Safari UAT.
- Product-owner acceptance dan bukti rollback/deployment sebelum produksi.

## Assessment

Reintegrasi lokal selesai dan repository aman untuk dibuat checkpoint commit,
di-push, lalu dijadikan Vercel Preview. Production promotion belum disetujui:
external staging/deployment smoke dan human UAT di atas masih wajib diselesaikan
terhadap exact commit/artifact yang akan dipromosikan.

## 2026-09-11 backend/QR/slug audit addendum

The active backend checkout is `C:\xampp\htdocs\krtnmdgtlv2API`; the
double-`d` spelling in the implementation brief does not exist. Source audit
verified Node/Express composition, native `qrcode` PNG rendering with cache and
ETag, seven-letter cryptographic Starter allocation, binary unique slug schema,
and Starter mutation DTO exclusion. Frontend API configuration remains
`127.0.0.1:3000/api/v1` for local hosts.

Initial preflight stopped safely while MariaDB was unreachable. After XAMPP
MariaDB was started, the exact `krtnmdgtlv2` identity, binary unique slug
index, and migration history were verified; a timestamped logical backup was
created before applying the only pending additive migration, 011.

Final evidence includes 142/142 frontend tests, 156/156 non-database backend
tests, 1/1 database integration test, direct and proxied health HTTP 200, CORS
HTTP 204, a passing read-only Newman System run, and isolated `_test` Starter
E2E for exact-case slug, QR, and VCF. The temporary test record was removed by
rebuilding the test baseline. Full credentialed Postman mutations and
production/Vercel UAT remain external gates.

## 2026-09-12 owner clarification

The Starter access-model conflict is resolved: creation is anonymous, while
maintenance/editing requires a verified account and card claim. Checkout is an
intentional product pause, not an implementation ambiguity, and remains disabled
until a future explicit decision confirms Midtrans API readiness.
