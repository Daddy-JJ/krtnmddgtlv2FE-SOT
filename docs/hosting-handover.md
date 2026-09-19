# KartuNamaDigital Frontend Hosting Handover

Dokumen ini berisi informasi operasional frontend yang tidak rahasia. Backend
source, database, migration, mail worker, dan payment operations dikelola di
repository backend terpisah.

## Canonical topology

```text
Browser
  → Vercel frontend on a recognized production hostname
  → https://api.kartunamadigital.id/api/v1/*
  → backend HTTPS di shared hosting
```

Frontend tidak mengetahui credential backend. Vercel Function proxy tetap ada
sebagai fallback same-origin. Proxy hanya membutuhkan `BACKEND_API_BASE_URL`,
misalnya `https://api.kartunamadigital.id`, tanpa path `/api/v1`, query,
fragment, username, atau password.

## Current backend hosting baseline

Owner-confirmed migration baseline (2026-09-19):

| Item | Current value |
|---|---|
| Hosting package | `nimbus_plus` |
| Server name | `sierra` |
| cPanel | 138.0 (build 7) |
| Apache | 2.4.68 |
| Database service | MariaDB 11.4.13-cll-lve-log |
| Architecture / OS | x86_64 / Linux |
| Shared public IP | `202.155.137.45` |
| Sendmail path | `/usr/sbin/sendmail` |
| Perl | 5.40.2 at `/usr/bin/perl` |
| Kernel | `6.12.0-211.49.1.el10_2.x86_64` |
| Python | 3.12.14 |
| Node.js selected/recommended by hosting panel | 24.20.0 |

The production API domain remains `api.kartunamadigital.id`; frontend domains,
API paths, and the remote file/application layout are unchanged. Authoritative
DNS for host `api` must point to the new shared IP `202.155.137.45`. The old
shared IP `202.10.43.184` is superseded and must not be reused.

Node.js 24.20.0 above is a hosting capability shown by the panel. It does not
by itself change the backend repository's supported engine range. Validate the
backend dependency lockfile, tests, migrations, mail worker, and startup under
Node.js 24 in the backend repository before treating that runtime as approved.
No credential, database name, or connection string is recorded here.

## Current DNS-zone baseline

Owner-provided panel evidence dated 2026-09-19 reports the zone's configured
nameservers as:

- `ns1.domainesia.net`
- `ns2.domainesia.net`

Visible records in that panel use TTL 14400:

| Host | Type | Target / value |
|---|---|---|
| `kartunamadigital.id` | A | `202.155.137.45` |
| `kartunamadigital.id` | MX priority 0 | `kartunamadigital.id` |
| `mail.kartunamadigital.id` | CNAME | `kartunamadigital.id` |
| `www.kartunamadigital.id` | CNAME | `kartunamadigital.id` |
| `ftp.kartunamadigital.id` | A | `202.155.137.45` |

The visible SPF TXT record contains the new IP plus legacy IP entries
`202.10.43.183` and `202.10.43.184`, as well as `a`, `mx`, and the
MailChannels relay include. Do not remove legacy SPF mechanisms until actual
outbound mail sources are audited; DNS web/API routing and mail authorization
are separate concerns.

Important topology check: the visible apex A record and `www` CNAME resolve
toward shared hosting, while this frontend SOT still names Vercel as canonical.
Before the next frontend deployment, verify public NS delegation and decide
whether apex/`www` should target Vercel or shared hosting. Do not infer the
public delegation from a zone-editor screenshot alone. The production API
health endpoint was owner-verified as HTTP 200 after migration.

## Local integration

Untuk pengembangan lokal, jalankan frontend source pada
`http://127.0.0.1:8080` dan backend Express pada `http://127.0.0.1:3000`.
Frontend mendeteksi hostname lokal ketika public API placeholder belum diganti
dan menggunakan `http://127.0.0.1:3000/api/v1` secara langsung. PHP built-in
server tidak menyediakan reverse proxy.

Server development yang direkomendasikan adalah npm run dev dari root frontend.
Server ini melayani route dan aset source, mempertahankan case slug publik seperti
/YAjXHrF, serta menyediakan proxy /api/v1 ke backend port 3000:

    cd C:\xampp\htdocs\krtnmddgtlv2FE-SOT
    npm.cmd run dev

Health check yang dipakai:

```text
http://127.0.0.1:3000/api/v1/health
```

Jika browser menerima HTML 404 dari `/api/v1`, periksa bahwa request tidak
menuju port frontend `8080`; request harus menuju port backend `3000`. Backend
harus mengizinkan credentialed CORS dari `http://127.0.0.1:8080`. Hostname
`localhost:8080` dipetakan ke backend `127.0.0.1:3000`, tetapi Origin tersebut
tetap harus diizinkan backend; penggunaan `127.0.0.1` adalah jalur kanonis.

## Vercel project settings

| Setting | Value |
|---|---|
| Root Directory | Repository root |
| Framework Preset | Other |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` melalui `vercel.json` |
| Production browser API | `PUBLIC_API_BASE_URL_PRODUCTION=https://api.kartunamadigital.id/api/v1` |
| Browser timeout | `PUBLIC_API_TIMEOUT_MS=30000` |
| Server proxy origin | `BACKEND_API_BASE_URL=https://api.kartunamadigital.id` |

Jangan mengubah Output Directory kembali ke `.`. Source root memuat dokumentasi,
test, dan metadata yang bukan public asset.

## Release sequence

1. Pastikan working tree hanya memuat perubahan yang dimaksud.
2. Jalankan `npm ci`, `npm run build`, dan `npm test`.
3. Buat Vercel Preview deployment.
4. Verifikasi `/`, route publik, satu public slug, dan `/api/v1/health`.
5. Uji Login/Signup, Starter claim, cookie/CSRF, public card, serta file download
   terhadap backend staging yang stabil.
6. Promote deployment yang sama setelah acceptance; jangan rebuild source berbeda.

Proxy fail-closed ketika upstream kosong/tidak valid, memakai HTTP, localhost,
credentialed URL, path tambahan, atau `*.trycloudflare.com`. Timeout fallback
proxy adalah 30 detik dan tidak boleh lebih pendek dari Starter create.

## Transitional cPanel fallback

Vercel adalah target kanonis. Bila frontend lama masih harus diperbarui sementara
di cPanel, salin hanya static allowlist:

```bash
git pull --ff-only origin main
npm run build:static
/bin/cp -R dist/* /home/karj9582/public_html/
/bin/cp .htaccess /home/karj9582/public_html/
```

`.cpanel.yml` memakai boundary yang sama. Fallback memerlukan
`PUBLIC_API_BASE_URL=https://api.kartunamadigital.id/api/v1` dalam `.env` server
yang tidak di-track.

Copy tidak menghapus artefak lama. Jika document root pernah menerima seluruh
repository, lakukan audit dan pembersihan manual terpisah setelah target dan
backup diverifikasi. Operasi tersebut tidak dilakukan dari fase reintegrasi ini.

## Troubleshooting

- `BACKEND_NOT_CONFIGURED`: periksa `BACKEND_API_BASE_URL` di Vercel lalu redeploy.
- Static route hilang: pastikan directory/file runtime masuk allowlist
  `scripts/build-static.mjs` dan hasilnya ada di `dist/`.
- Login loop atau CSRF error: verifikasi production API base, credentialed CORS,
  cookie Secure/HttpOnly, dan backend origin; periksa proxy hanya jika request
  memang memakai fallback same-origin.
- Frontend lama: verifikasi deployment ID/commit Vercel dan lakukan hard refresh.
- API error: catat request ID; troubleshooting backend dilakukan di repository
  dan hosting backend terpisah.

Jangan menyimpan PAT, password, `.env`, private key, OTP, cookie, atau API token
di repository, command history, screenshot, dan dokumen ini.
