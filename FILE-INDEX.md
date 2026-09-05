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
| `docs/hosting-handover.md` | Handover operasional non-secret |

## Runtime entry points

| Path | Purpose |
|---|---|
| `index.html` | Landing page |
| `create/index.html` | Starter creation |
| `login/`, `register/` | Authentication |
| `app/` | Member workspace |
| `admin/` | Super Admin workspace |
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
| `assets/` | Compiled CSS, source CSS, image, icon, theme preview |
| `locales/` | Locale resources; English saat ini deferred |
| `tests/` | Native Node contract/security tests |
| `scripts/build-static.mjs` | Allowlisted static build |
| `scripts/local-server.mjs` | Local route, asset, slug, and API proxy server |
| `scripts/dev-server.mjs` | npm run dev entry point on 127.0.0.1:8080 |

Verified Phase 10 inventory: 60 route shells, 27 page controllers, dan 10 card
theme templates. Angka ini bersifat turunan dan harus mengikuti repository.

## Deployment files

- `vercel.json`: build, rewrites, dan output `dist/`.
- `.vercelignore`: material yang tidak diunggah.
- `.env.example`: nama variable publik/server-side tanpa secret.
- `.cpanel.yml` dan `.htaccess`: fallback transisi, bukan target kanonis.

## Historical material

`docs/_legacy-sot/` adalah snapshot read-only dari SOT monorepo lama. Gunakan
hanya untuk provenance atau audit. Jangan mengikuti path, status, atau precedence
di dalamnya sebagai instruksi aktif.

## Maintenance rule

Perbarui indeks ini setelah perubahan struktur atau entry point. Bila indeks
berbeda dari kode, test, atau dokumen authority, repository aktual dan precedence
di `AGENTS.md` menentukan fakta; indeks kemudian wajib dikoreksi.
