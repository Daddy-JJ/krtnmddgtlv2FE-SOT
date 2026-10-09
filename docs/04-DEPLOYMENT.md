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

## Local development

Use the repository Node development server for local work. It serves the
allowlisted frontend routes and assets, maps a case-sensitive one-segment slug
such as `/YAjXHrF` to `public-card/index.html`, and proxies `/api/v1` to the
local backend:

    cd C:\xampp\htdocs\krtnmddgtlv2FE-SOT
    npm.cmd run dev

Open `http://127.0.0.1:8080/` and run the separate Express backend on port 3000.
With the public runtime placeholder untouched, the browser API base remains
`http://127.0.0.1:3000/api/v1`. Verify backend health at
`http://127.0.0.1:3000/api/v1/health`. The backend CORS policy must allow
credentialed requests from `http://127.0.0.1:8080`; if `localhost:8080` is
used instead, it must be allowed separately.

An HTML 404 from `http://127.0.0.1:8080/api/v1/...` indicates the PHP server
or another static server is being used instead of `npm run dev`, or the
frontend runtime API override is wrong. Inspect the browser Network panel and
confirm the API request reaches port 3000. PHP built-in server remains a
static-only fallback and does not provide slug routing or an API proxy.

## Vercel configuration

`vercel.json` locks:

- Framework: Other (`null`).
- Build command: `npm run build`.
- Output directory: `dist`.
- Baseline response headers: HSTS, `nosniff`, frame denial on routes other than
  `/` and `/preview/*`, strict-origin referrer policy, and restrictive
  permissions policy.
- The existing Inovasia URL `/` omits `X-Frame-Options` and uses CSP
  `frame-ancestors 'self' https://inovasia.co.id https://www.inovasia.co.id`.
  Other sites cannot frame it in CSP-capable browsers. It stays indexable and
  works normally for top-level visitors. When framed, it uses the light theme
  without a first-visit chooser or analytics page view.
- `/preview/` rewrites to the homepage shell; `/preview/{slug}` keeps the
  public-card preview. They use the same frame-ancestors allowlist and return
  `X-Robots-Tag: noindex, nofollow`; a top-level `/preview/` visit redirects to
  `/`. All other routes keep `X-Frame-Options: DENY`.
- `/api/v1/:path*` rewrite to the Vercel proxy Function.
- One-segment public slug rewrite to `/public-card/index.html`.
- Build-time Vercel Web Analytics injection for sitemap marketing pages only.

The root project setting must not override these with output `.`.

No Inovasia-side URL change is required. After deploying, verify `/` returns
HTTP 200 with the Inovasia `frame-ancestors` policy and no `X-Frame-Options`;
verify `/login/` and `/app/` still return `X-Frame-Options: DENY`. Test the
actual Inovasia mini iframe in a browser. The root exception depends on CSP
support: legacy browsers without CSP cannot enforce an origin-specific frame
allowlist because `X-Frame-Options` has no interoperable allow-origin setting.

## Environment

The backend shared-hosting migration reported on 2026-09-19 keeps the production
origin `https://api.kartunamadigital.id`, API paths, and remote layout unchanged.
The current server is `sierra` on package `nimbus_plus`, with shared IP
`202.155.137.45`. See `docs/hosting-handover.md` for the non-secret inventory.
DNS/SSL and `/api/v1/health` must be reverified after migration; the prior IP
`202.10.43.184` is superseded.

Required Vercel variables:

```text
BACKEND_API_BASE_URL=https://api.kartunamadigital.id
PUBLIC_API_BASE_URL_PRODUCTION=https://api.kartunamadigital.id/api/v1
PUBLIC_API_TIMEOUT_MS=30000
```

Rules:

- HTTPS only.
- Origin only; no `/api/v1` path.
- No username/password, query, or fragment.
- No localhost/IP loopback.
- No temporary `*.trycloudflare.com` upstream.
- Configure separately for Preview and Production.

`BACKEND_API_BASE_URL` is consumed server-side by the proxy. The other two
values are public browser configuration and are safe to expose in the static
bundle. Set `PUBLIC_API_BASE_URL_LOCAL=http://127.0.0.1:3000/api/v1` only in
local/pre-production development environments. The proxy fallback timeout is
30 seconds, so it is not shorter than the Starter create timeout.

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
- `/_vercel/insights/script.js` loads on an indexable marketing page and a
  `/_vercel/insights/view` request appears after visiting it.
- Analytics script is absent from account, admin, Starter form, and dynamic
  public-card pages.

Web Analytics must be enabled in the Vercel project dashboard before deployment.
No analytics-specific environment variable or frontend secret is required.
- Cookie, CSRF, login, refresh, logout.
- Starter creation, email handoff, Login/Signup, claim, edit.
- Public card exact-case slug, vCard, and QR.
- Resume authorized upload/download.
- Checkout disabled for failed/malformed/disabled capabilities; enabled production
  uses `Bayar melalui Duitku`, enabled restricted sandbox retains its warning.
- Light/Dark chooser pada fresh storage serta stored `light`/`dark` preference.
- Mobile, keyboard, reduced motion, Android/iOS/Safari evidence.

Promote the exact accepted deployment artifact. Backend health alone does not
approve frontend production, and frontend smoke alone does not approve backend.

### Duitku production coordination (FE-D-041)

Owner approved production frontend source, not hosting activation/deploy/payment.
The release flag is true; backend capabilities remain a mandatory second gate.
All local payment/browser QA uses mocks and does not prove merchant connectivity.

Backend operator only: cPanel -> Setup Node.js App -> API application
(`api.kartunamadigital.id`) -> Environment Variables. Never place merchant keys
in Vercel/frontend runtime config, documentation, chat, logs or Git. Validate the
exact keys against the deployed backend before applying them:

```dotenv
PAYMENT_PROVIDER=duitku
DUITKU_ENV=production
DUITKU_ENABLED=true
PAYMENT_CHECKOUT_ENABLED=false
DUITKU_PRODUCTION_MERCHANT_CODE=<enter production merchant code directly in hosting>
DUITKU_PRODUCTION_API_KEY=<enter production API key directly in hosting>
DUITKU_PRODUCTION_CALLBACK_URL=https://api.kartunamadigital.id/api/v1/payments/duitku/callback
DUITKU_PRODUCTION_RETURN_URL=https://kartunamadigital.id/app/billing/result/
```

These are configuration names/placeholders, not credentials. Save and restart
the backend application after the separately authorized change. Do not replace
unrelated environment values or remove sandbox credentials/history without
reviewing pending sandbox invoices and backend startup validation. Callback is
provider POST; opening its URL with GET does not test payment notification.

Release sequence:

1. Verify compatible backend/version, production configuration and callback/return
   URLs while PAYMENT_CHECKOUT_ENABLED=false. Confirm migration state in backend.
2. Deploy approved frontend; user-scoped disabled capabilities keep checkout shut.
3. If controlled UAT requires account restriction, arrange a backend production
   gate BEFORE activation. Sandbox UUID allowlisting does not restrict production.
4. Separate owner approval for hosting activation and account/plan/real amount.
   Backend operator enables PAYMENT_CHECKOUT_ENABLED, saves and restarts app.
5. Verify authenticated capabilities report enabled Duitku production; complete
   an approved real payment. Verify backend-confirmed paid, valid callback/status
   evidence, exactly-once entitlement, subscription/cards refetch and reload/login.
   Test pending, cancel/failure, duplicate submit, unsafe return and recovery safely.
6. Public opening only after recorded hosted/browser UAT and owner approval.

Rollback new orders with PAYMENT_CHECKOUT_ENABLED=false and restart backend.
Keep gateway/callback/reconcile processing available for already-created invoices;
do not erase history, change pending orders to a different environment, or infer
success from browser resultCode. Frontend rollback alone does not stop API orders.

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
