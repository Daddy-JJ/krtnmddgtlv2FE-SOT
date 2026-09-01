# KartuNamaDigital Frontend

Repository ini adalah source frontend mandiri untuk KartuNamaDigital.id. Isinya
mencakup halaman publik, onboarding Starter, workspace member, workspace internal,
renderer kartu, dan proxy API Vercel. Implementasi backend berada di repository
terpisah dan diakses melalui REST API.

## Stack

- HTML multi-page dan Vanilla JavaScript ES modules.
- Tailwind CSS 4 yang dikompilasi saat build serta CSS aplikasi khusus.
- Fetch API melalui satu client cookie-authenticated.
- Native Node.js test runner.
- Vercel untuk hosting frontend dan same-origin API proxy.

Tidak ada React, Vue, Next.js, atau framework SPA di repository ini.

## Menjalankan pemeriksaan lokal

Gunakan Node.js 22 dan npm:

```bash
npm ci
npm run qa
```

`npm run qa` menjalankan static build, kompilasi Tailwind, lalu seluruh native
Node test. Build membuat output publik di `dist/`; folder tersebut generated dan
tidak boleh diedit atau di-commit. Folder `dist/` boleh tidak ada di working tree
di antara build; Vercel membuatnya dari source saat deployment.

Halaman statis harus dibuka melalui HTTP server, bukan `file://`. Pengujian alur
autentikasi end-to-end memerlukan `/api/v1` yang diteruskan ke backend kompatibel.
Test local-stack otomatis memakai helper yang berada di repository ini; lihat
status baseline terbaru di `STATUS.md`.

Untuk preview frontend di localhost tanpa membuat `dist/`, jalankan server dari
root repository sehingga URL root-relative seperti `/assets/...` tetap mengarah
ke source project:

```powershell
cd C:\xampp\htdocs\krtnmddgtlv2FE_SOT
C:\xampp\php\php.exe -S 127.0.0.1:8080 -t .
```

Buka `http://127.0.0.1:8080/`. URL subfolder Apache
`http://localhost/krtnmddgtlv2FE_SOT/` tidak cocok dengan path root-relative
frontend tanpa konfigurasi VirtualHost/Alias tambahan.

## Source of truth

Mulai dari:

1. `AGENTS.md`
2. `AI_CONTEXT.md`
3. `FILE-INDEX.md`
4. `LOCKED-PLAN.md`
5. `SOT-MANIFEST.md`

Dokumen rinci berada di `docs/01-FRONTEND-ARCHITECTURE.md` sampai
`docs/05-DECISION-LOG.md`. Dokumen lama dipertahankan sebagai snapshot read-only
di `docs/_legacy-sot/` dan tidak mempunyai precedence.

## Deployment

Target kanonis frontend adalah Vercel. Browser memanggil same-origin `/api/v1`;
Vercel Function `api/v1/[...path].js` meneruskannya ke origin backend HTTPS yang
ditentukan melalui `BACKEND_API_BASE_URL`.

Hanya isi `dist/` yang menjadi aset statis publik. Dokumentasi, test, metadata
repository, dan source proxy tidak dimasukkan ke output tersebut.

## Status penting

- Launch menggunakan Bahasa Indonesia; English ditunda.
- Checkout membership masih paused dan harus menampilkan `Under development`.
- First-visit Light/Dark chooser sudah diimplementasikan dan diuji.
- Build dan test lokal lulus; staging API, Vercel Preview, serta UAT perangkat
  nyata tetap diperlukan sebelum production-readiness disetujui.

Detail implementasi dan defect aktif dicatat di `STATUS.md`.
