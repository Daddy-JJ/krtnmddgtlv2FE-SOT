# Frontend SOT Manifest

## Scope

Manifest ini hanya mengatur frontend KartuNamaDigital.id. Informasi backend di
repository ini dibatasi pada kontrak yang dibutuhkan browser dan deployment proxy.

## Authority map

| Concern | Authority |
|---|---|
| Locked scope dan keputusan produk | `LOCKED-PLAN.md` |
| Keputusan product owner | `docs/05-DECISION-LOG.md` |
| Membership dan feature limits | `docs/02-PRODUCT-AND-MEMBERSHIP.md` |
| API yang dikonsumsi frontend | `docs/03-API-CONSUMER-CONTRACT.md` |
| Struktur dan dependency frontend | `docs/01-FRONTEND-ARCHITECTURE.md` |
| UI/UX conventions dan accessibility | `docs/01-FRONTEND-ARCHITECTURE.md`, lalu contract halaman/test |
| Deployment frontend | `docs/04-DEPLOYMENT.md` |
| Implementasi aktual dan known gaps | kode, test, lalu `STATUS.md` |
| Operasional hosting | `docs/hosting-handover.md` |

`FILE-INDEX.md` dan `PROJECT-STRUCTURE.md` adalah peta turunan dari repository
aktual. Keduanya membantu navigasi, tetapi tidak boleh membuat scope, business
rule, atau arsitektur baru.

## Machine-readable implementation sources

- Theme catalog: `config/theme-registry.json`.
- Runtime API configuration: `config/app-config.js` dan
  `config/runtime-config.js`.
- Deployment configuration: `vercel.json`.
- Dependency lock: `package-lock.json`.
- Public-route inventory: directory shells dan `sitemap.xml`.

Machine-readable files tidak boleh memperluas locked product scope. Bila terjadi
konflik, perbaiki implementasi agar sesuai authority map.

## External backend authority

Backend repository memegang authority untuk OpenAPI, server validation, database,
RBAC, payment, email, file storage, dan operational jobs. Repository frontend ini
tidak menyimpan salinan OpenAPI lama sebagai SOT. Sinkronisasi lintas repository
dilakukan melalui API consumer contract dan pengujian integrasi/Postman.

## Historical archive

`docs/_legacy-sot/` berstatus read-only historical evidence. Semua path lama yang
memakai prefix `frontend/`, backend monorepo, database, atau deployment lama tidak
aktif kecuali diadopsi ulang secara eksplisit ke dokumen kanonis.
