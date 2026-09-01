# Frontend Deployment

## Canonical target

Frontend is hosted on Vercel. Backend runs from a separate repository on shared
hosting and exposes a stable HTTPS API origin.

```text
source repository
  → npm ci
  → npm run build
  → dist/ static allowlist
  → Vercel CDN

api/v1/[...path].js
  → BACKEND_API_BASE_URL
  → shared-hosted backend /api/v1/*
```

## Build

`npm run build` performs:

1. `node scripts/build-static.mjs` to recreate `dist/` from explicit runtime
   directories/files.
2. Tailwind compilation from `assets/css/tailwind-input.css` into
   `dist/assets/css/tailwind.css`.

The build does not modify tracked `assets/css/tailwind.css`. `dist/` is generated,
ignored, and is the only Vercel static Output Directory.

## Vercel configuration

`vercel.json` locks:

- Framework: Other (`null`).
- Build command: `npm run build`.
- Output directory: `dist`.
- Baseline response headers: HSTS, `nosniff`, frame denial, strict-origin
  referrer policy, dan restrictive permissions policy untuk seluruh route.
- `/api/v1/:path*` rewrite to the Vercel proxy Function.
- One-segment public slug rewrite to `/public-card/index.html`.

The root project setting must not override these with output `.`.

## Environment

Required Vercel server-side variable:

```text
BACKEND_API_BASE_URL=https://api.kartunamadigital.id
```

Rules:

- HTTPS only.
- Origin only; no `/api/v1` path.
- No username/password, query, or fragment.
- No localhost/IP loopback.
- No temporary `*.trycloudflare.com` upstream.
- Configure separately for Preview and Production.

This value is consumed server-side by the proxy and is not the same as the
fallback browser `PUBLIC_API_BASE_URL` placeholder.

## Static-public boundary

Vercel public assets must not include:

- `docs/` or historical SOT.
- `tests/`.
- Markdown governance.
- `.env*`, `.git*`, `.cpanel.yml`, or `.htaccess`.
- `package.json`, deployment source, or proxy source as static downloads.

`.vercelignore` reduces upload scope and `dist/` provides the serving boundary.
Deployment-boundary tests verify representative included and excluded files.

## Release gates

Before Preview:

```bash
npm ci
npm run qa
```

Then verify:

- Landing and indexable public routes.
- Auth and member routes remain `noindex`.
- API health through same-origin `/api/v1`.
- Cookie, CSRF, login, refresh, logout.
- Starter creation, email handoff, Login/Signup, claim, edit.
- Public card exact-case slug, vCard, and QR.
- Resume authorized upload/download.
- Disabled checkout and exact paused copy.
- Light/Dark chooser pada fresh storage serta stored `light`/`dark` preference.
- Mobile, keyboard, reduced motion, Android/iOS/Safari evidence.

Promote the exact accepted deployment artifact. Backend health alone does not
approve frontend production, and frontend smoke alone does not approve backend.

## Transitional cPanel path

cPanel frontend deployment is a fallback during migration, not the canonical
target. It may copy only `dist/*` plus `.htaccess`. Existing document roots that
previously received repository-root copies require separately approved cleanup;
the build does not delete remote stale files.

## Rollback

- Vercel: promote/reassign the last known-good deployment.
- Do not rebuild an older commit with newer environment assumptions when an exact
  prior artifact is available.
- Backend rollback is managed in the backend repository/runbook.
- Record deployment ID, source commit, API origin environment, smoke evidence,
  and rollback result without exposing secret values.
