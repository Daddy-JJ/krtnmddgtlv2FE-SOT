# Frontend Architecture

## Overview

KartuNamaDigital frontend adalah multi-page static application. Setiap route
memiliki HTML shell dan memuat ES module yang relevan. Tidak ada client-side
router global atau framework component runtime.

```text
HTML route shell
  → page controller (`pages/`)
  → feature service (`services/`)
  → central API client
  → same-origin `/api/v1`
  → Vercel Function proxy
  → external backend HTTPS
```

## Layer responsibilities

| Layer | Path | Responsibility |
|---|---|---|
| Route shell | route directories | Semantic HTML, accessible states, module/style loading |
| Page controller | `pages/` | DOM orchestration, events, view state, redirects |
| Shared UI | `components/` | Application shell, form utilities, live preview, card templates |
| Feature service | `services/` | Endpoint operations and presentation mapping |
| Transport | `services/api-client.js` | API URL builder, cookies, CSRF, refresh, timeout, errors |
| Validation | `validators/` | Fast browser validation matching consumer contract |
| Utility | `utils/` | Cookie parsing, safe URL, auth navigation context |
| Configuration | `config/` | Public runtime config and theme metadata |
| Visual assets | `assets/` | Tailwind source/output, CSS, images, icons |

Page controllers may use the central API client directly only for an operation
that has no service adapter yet. New or repeated operations should be placed in a
feature service.

## Route model

Source contains 61 route shells plus ten card-theme HTML templates.

Main route groups:

- Public: `/`, `/about/`, `/blog/*`, `/faq/`, `/contact/`, legal pages.
- Auth/onboarding: `/create/`, `/register/`, `/login/`, OTP/reset pages,
  `/starter/manage/`.
- Member: `/app/`, `/app/card/*`, `/app/billing/`, `/app/account/`,
  `/app/resume-enhancement/*`, `/app/feedback/`.
- Internal: `/admin/*` and `/specialist/*`.
- Public card: a case-sensitive one-segment `/{slug}` rewrite to
  `/public-card/index.html`.

Vercel must resolve real static files/directories and `/api/v1` before the public
slug fallback. Nested unknown routes are not public-card slugs.

## Page shell conventions

- Public indexable pages have canonical metadata and semantic landmarks.
- Auth, member, and internal pages use `noindex`.
- Authenticated pages load `components/app-shell.js` when they belong to the
  shared member shell.
- All substantive website shells load compiled CSS and website theme assets.
- Compatibility routes may use redirects when covered by tests.

## SEO ownership (2026-09-19)

Indexable marketing metadata is authored in each static HTML head, not injected
by JavaScript. The ten URLs in sitemap.xml retain unique intent:
home targets "kartu nama digital"; About explains the service, FAQ answers
questions, Contact provides support, and legal pages retain their policy titles.
The profile article targets practical usage; the CV article retains CV intent.
Each has a canonical production URL, description, Open Graph/Twitter metadata
and appropriate WebSite/Organization/WebPage/ContactPage/BlogPosting JSON-LD.
Do not add keyword stuffing, invented ratings or unsupported rich-result claims.

Auth, create, management, member, admin and specialist routes remain noindex,
including internal compatibility redirects. robots.txt allows crawling so robots
meta can be read; it is not authorization. No private routes enter the sitemap.
Update lastmod only when that page changes meaningfully.

The existing public-card controller owns per-person metadata and canonical URLs.
It still requires JavaScript/API rendering; static social crawlers cannot be
assumed to receive personalized metadata. SSR/prerender and dynamic-card sitemap
need separate backend/deployment coordination and privacy review.
The ten card designs are unchanged. Admin-managed landing copy may override
the fallback H1: keep CMS heroTitle aligned with the static metadata without
silently overwriting published content.

Release checks: verify canonical-domain deployment, inspect production robots
and response headers, submit sitemap in Search Console, then monitor indexing
and search queries. Local test success does not prove indexing or rankings.

Google references: https://developers.google.com/search/docs/appearance/title-link
and https://developers.google.com/search/docs/crawling-indexing/special-tags .

## Card rendering

`config/theme-registry.json` defines ten immutable theme codes, display metadata,
template paths, and preview assets. `services/card-theme-renderer.js` binds a
normalized card view-model into template nodes through safe DOM operations.

The public-card page, member design gallery, and unsaved card-editor preview share
the registry, stylesheet, templates, and renderer. `components/card-live-preview.js`
owns allowlisted template loading, closed Shadow DOM isolation, preview updates,
and scaling for member previews. Tier labels are authorization metadata and must
not appear in card artwork.

## Configuration

`config/app-config.js` reads `globalThis.__KND_CONFIG__` and defaults to:

- API base values come from `PUBLIC_API_BASE_URL_LOCAL` and
  `PUBLIC_API_BASE_URL_PRODUCTION` in the environment. Local hosts use the
  local value; `kartunamadigital.id`, `www.kartunamadigital.id`, and
  `krtnmdgtlv2-fe-ten.vercel.app` use the production value.
- Request timeout defaults to 12 seconds when no public value is injected;
  production deployment sets `PUBLIC_API_TIMEOUT_MS=30000`.
- Locale `id`.

`config/runtime-config.js` is public configuration only. It must never contain
credentials. Server-owned `globalThis.__KND_CONFIG__` remains authoritative;
environment-injected public values select local or production routing. The
three recognized production hosts call the production API base directly. The
Vercel proxy remains available for same-origin `/api/v1` fallback traffic,
uses `BACKEND_API_BASE_URL` server-side, and waits at least as long as the
30-second Starter create request.

Runtime locale support is currently limited to `id`; English resources remain
dormant scaffolding. `assets/js/site-theme.js` mounts an accessible Light/Dark
chooser only when `knd.theme.preference` has no valid stored value, then keeps the
global toggle available for later changes.

## Opt-in visual-system adapter

The Foundations-inspired adapter is split into three native CSS layers:

- assets/css/foundations-tokens.css owns semantic light/dark tokens.
- assets/css/foundations-typography.css owns the type hierarchy.
- assets/css/foundations-primitives.css owns common layout and control styling.

Every visible route shell loads all three files after site-theme.css and applies the ui-foundations scope. Marketing and blog shells also apply editorial mode; authentication, member workspace, and internal workspace retain the interface type role. The adapter owns the shared token, layout, component, and spacing rhythm. It adds no React or Next.js runtime and changes no API behavior.

The ten card-theme templates, assets/css/card-themes.css,
services/card-theme-renderer.js, config/theme-registry.json, and the public-card
artwork are outside this visual migration. Their presentation must remain
stable unless the owner approves a separate card-design project.

### Shared UI ownership (2026-09-19)

Place `ui-foundations` on html so dynamically inserted controls and overlays
inherit the same tokens. Page, section, card and control typography use the
shared `--fdn-type-*` tokens. System sans/serif font stacks are deliberate;
the adapter does not load Ubuntu/Average or depend on a font CDN.

Reuse `fdn-panel`, `fdn-button--primary`, `fdn-button--secondary` and
`fdn-nav-link` for new components. Existing class aliases remain for migration
compatibility. Update the owning token/type/primitive rule rather than creating
per-page copies. Legacy color variables bridge to semantic theme tokens.
Public-card templates remain outside this scope.

## Local development server

scripts/local-server.mjs is the single owner for local static-file resolution,
case-sensitive one-segment public slug routing, asset content types, and the
optional /api/v1 proxy to the separate Express backend. scripts/dev-server.mjs
binds the server to 127.0.0.1:8080 by default and is exposed through npm run dev.
The test local-stack imports this same implementation so routing QA cannot drift
from the developer server.

## Source and deployment boundary

`scripts/build-static.mjs` copies an explicit list of runtime directories and
root files into `dist/`. It skips Markdown/hidden placeholders, rejects symlinks
and unknown extensions, and refuses to clean any directory other than project
`dist/`.

`tests/runtime-module-graph.test.js` verifies HTML entry modules, relative import
resolution, classified dormant modules, and single-owner shared responsibilities.

Adding a new public route or runtime directory therefore requires:

1. Source implementation.
2. Addition to the public build allowlist when needed.
3. Deployment-boundary regression coverage.
4. Route/SEO/security tests appropriate to the page.

## Dependency rules

- HTML shells do not contain business authority.
- Page controllers do not construct backend origins.
- API request dan download link memakai `buildApiUrl()` dengan configured API base.
- Services do not manipulate unrelated page DOM.
- API client does not encode feature-specific business rules.
- Validators do not grant permission or entitlement.
- Browser state never substitutes for backend authorization.
- Static asset fetch is allowed; authenticated REST uses the API client.

## Intentional separations

- Route shell versus page controller.
- Browser services versus Vercel proxy Function.
- Member, Super Admin, and CV Specialist experiences.
- Website Light/Dark chrome versus user-selected card artwork.
- Runtime source versus generated `dist/`.
- Canonical SOT versus read-only legacy archive.
