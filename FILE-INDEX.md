# File Index

## Start here

| File | Purpose |
|---|---|
| `README.md` | Entry point dan perintah lokal |
| `AGENTS.md` | Aturan wajib kerja dan precedence |
| `AI_CONTEXT.md` | Konteks ringkas repository |
| `LOCKED-PLAN.md` | Scope dan keputusan produk terkunci |
| `SOT-MANIFEST.md` | Peta source of truth |
| `PROJECT-STRUCTURE.md` | Peta turunan struktur repository aktual |
| `STATUS.md` | Fakta implementasi, gap, dan validasi terakhir |
| `REVIEW-REPORT.md` | Assessment reintegrasi dan readiness terakhir |

## Canonical frontend SOT

| File | Purpose |
|---|---|
| `docs/01-FRONTEND-ARCHITECTURE.md` | Struktur runtime, layer, route, dan dependency rule |
| `docs/02-PRODUCT-AND-MEMBERSHIP.md` | Fitur, tier, limit, dan user-flow contract |
| `docs/03-API-CONSUMER-CONTRACT.md` | REST contract yang dibutuhkan frontend |
| `docs/04-DEPLOYMENT.md` | Build dan deployment Vercel |
| `docs/05-DECISION-LOG.md` | Keputusan frontend yang disetujui product owner |
| `docs/TIER-IMPLEMENTATION-MATRIX.md` | Bukti implementasi Starter/Basic/Pro lintas frontend, API, DB, authorization, dan test |
| `docs/hosting-handover.md` | Handover operasional non-secret |

## Approved feature specifications and handoff

| File | Purpose |
|---|---|
| `docs/06-EMAIL-TEMPLATE-MANAGEMENT.md` | Email inventory, implemented editor, confirmed API, and Stage 4 validation evidence |
| `docs/EMAIL-TEMPLATES-BACKEND-HANDOFF.md` | Completed backend Stage 2 brief and returned integration evidence; not backend OpenAPI |

These documents follow canonical SOT precedence. The backend API is active
locally; planned frontend runtime files are not included in the inventory below.

## Runtime entry points

| Path | Purpose |
|---|---|
| `index.html` | Landing page |
| `create/index.html` | Starter creation |
| `login/`, `register/` | Authentication |
| `app/` | Member workspace |
| `admin/` | Super Admin workspace |
| `admin/feedback/` | Dedicated Super Admin Feedback Inbox |
| `specialist/` | CV Specialist workspace |
| `public-card/index.html` | Shell kartu publik root-slug |
| `api/v1/[...path].js` | Vercel same-origin API proxy |

## Frontend layers

| Path | Responsibility |
|---|---|
| `pages/` | Controller per halaman |
| `services/` | API adapter dan presentation service |
| `components/` | Shared shell, form helper, live preview, dan card template |
| `validators/` | Client-side validation, termasuk shared Resume DOCX rule |
| `utils/` | Cookie, URL, dan auth-flow utilities |
| `config/` | Runtime config dan theme registry |
| `assets/` | Compiled CSS, global theme, opt-in Foundations adapter, image, icon, theme preview |
| `locales/` | Locale resources; English saat ini deferred |
| `tests/` | Native Node contract/security tests |
| `scripts/build-static.mjs` | Allowlisted static build |
| `scripts/local-server.mjs` | Local route, asset, slug, and API proxy server |
| `scripts/dev-server.mjs` | npm run dev entry point on 127.0.0.1:8080 |

Current inventory: 62 route shells, 28 page controllers, dan 10 card theme
templates. Angka ini bersifat turunan dan harus mengikuti repository.

Super Admin operations use `services/admin-operations-service.js` as the
single endpoint adapter for statistics, feedback, cards, reports, system,
security, and existing operational lists.

Foundations adapter CSS:

- `assets/css/foundations-tokens.css`
- `assets/css/foundations-typography.css`
- `assets/css/foundations-primitives.css`

The adapter is loaded by every visible route shell except public-card and redirect-only compatibility shells. The ten card templates and public-card artwork remain outside its scope.

## Deployment files

- `vercel.json`: build, rewrites, dan output `dist/`.
- `.vercelignore`: material yang tidak diunggah.
- `.env.example`: nama variable publik/server-side tanpa secret.
- `.cpanel.yml` dan `.htaccess`: fallback transisi, bukan target kanonis.

## Historical material

Dokumen historis yang masih relevan telah diringkas ke dokumentasi kanonis di
`docs/`. Tidak ada snapshot legacy terpisah yang menjadi bagian repository.

## Maintenance rule

Perbarui indeks ini setelah perubahan struktur atau entry point. Bila indeks
berbeda dari kode, test, atau dokumen authority, repository aktual dan precedence
di `AGENTS.md` menentukan fakta; indeks kemudian wajib dikoreksi.
