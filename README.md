# Frontend

Phase 6I provides the mobile-first public shell, Auth/Starter onboarding pages,
an authenticated dashboard shell, basic card identity/contact editors,
card settings with slug/publish/QR panel, theme picker, social/catalog editors,
billing/payment UI, account security UI,
Indonesian/English locale loader, and a cookie-authenticated API client with
separate access and Starter CSRF contexts. It does not yet implement full live
template editing, full account profile editing, or admin pages.

The frontend uses a compiled Tailwind stylesheet with no browser-side Tailwind
runtime. Build and run the automated frontend checks with:

```bash
npm --prefix frontend run qa
```

Untuk menjalankan frontend dan backend pada satu origin di localhost, gunakan
`node tools/local-stack.mjs` dari root repository lalu buka
`http://127.0.0.1:3000`. Jangan memakai static file server tanpa proxy karena
request relatif `/api/v1` harus diteruskan ke backend Node.

Ikuti `docs/frontend/`, UI guidelines, design system, dan prompt frontend. Jangan membuat halaman yang backend phase-nya belum selesai.

The current theme HTML/CSS/renderer is a pre-implementation visual scaffold, not production-ready code. Phase 6 must align every template with its approved preview, replace the legacy `qrUrl` binding with distinct `canonicalUrl`/`qrImageUrl`, hide complete empty field rows, and route all external links through an HTTP(S)-only safe URL helper.

## Vercel deployment

Repository ini adalah static frontend tanpa generated build directory. `vercel.json` menetapkan root repository (`.`) sebagai Output Directory sehingga Vercel tidak mencari folder `public`.

Gunakan konfigurasi project:

- Framework Preset: `Other`
- Root Directory: kosong / repository root
- Build Command: `npm run build` atau default
- Output Directory: dikendalikan oleh `vercel.json` (`.`)

Default API frontend adalah same-origin `/api/v1`. Pada Vercel, Function di
`api/v1/[...path].js` meneruskan request tersebut ke origin backend stabil yang
diatur melalui Environment Variable `BACKEND_API_BASE_URL` di Project Settings.
Nilainya wajib berupa origin HTTPS tanpa path, misalnya
`https://api.kartunamadigital.id`. Atur terpisah untuk Preview dan Production.

Proxy bersifat fail-closed: konfigurasi kosong/tidak valid, HTTP, localhost, dan
domain sementara `*.trycloudflare.com` ditolak dengan respons 503. Cloudflare
Quick Tunnel hanya boleh dipakai untuk QA lokal dan tidak boleh menjadi target
deployment. `vercel.json` hanya meneruskan slug publik satu-segmen seperti
`/QaStart` ke shell `/public-card/index.html`, setara dengan aturan Apache
`.htaccess`.

Jika form Starter di Vercel menampilkan `BACKEND_NOT_CONFIGURED`, buka
**Vercel Project Settings → Environment Variables**, lalu isi
`BACKEND_API_BASE_URL` untuk Preview dan Production dengan origin backend Node
yang sudah hidup melalui HTTPS, misalnya `https://api.kartunamadigital.id`.
Jangan memasukkan `http://127.0.0.1:3000`, `localhost`, path `/api/v1`, atau
domain tunnel sementara. Redeploy setelah variabel disimpan.

## cPanel shared-hosting deployment

The checked-in runtime config uses the reviewed direct API origin
`https://api.kartunamadigital.id/api/v1` only when the browser host is exactly
`kartunamadigital.id` or `www.kartunamadigital.id`. Localhost, QA, and preview
hosts retain same-origin `/api/v1`; a server-owned `__KND_CONFIG__` override
remains authoritative.

Credentialed cross-subdomain deployment requires the backend environment to
allow the exact frontend origin, set `COOKIE_DOMAIN=.kartunamadigital.id`, keep
`COOKIE_SECURE=true`, and use `COOKIE_SAMESITE=Lax`. The frontend API client
already sends `credentials: include`; authentication credentials remain
HttpOnly while the signed CSRF cookies remain readable at path `/`.
