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

- API base `http://127.0.0.1:3000/api/v1` only for local `localhost` or
  `127.0.0.1` hosts while the public placeholder is active; other environments
  retain `/api/v1`.
- Request timeout 12 seconds.
- Locale `id`.

`config/runtime-config.js` is public configuration only. It must never contain
credentials. Server-owned `globalThis.__KND_CONFIG__` remains authoritative;
injected public values take precedence over local detection. On Vercel, browser
traffic remains same-origin and the server-side Function uses
`BACKEND_API_BASE_URL`.

Runtime locale support is currently limited to `id`; English resources remain
dormant scaffolding. `assets/js/site-theme.js` mounts an accessible Light/Dark
chooser only when `knd.theme.preference` has no valid stored value, then keeps the
global toggle available for later changes.

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
