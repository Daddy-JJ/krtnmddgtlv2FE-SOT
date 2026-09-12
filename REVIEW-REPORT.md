# Frontend SOT Reintegration Review

Review date: 2026-09-11

Status: **LOCAL REINTEGRATION VALIDATION COMPLETE; PRODUCTION READINESS PENDING EXTERNAL EVIDENCE**

## Repository classification

Repository adalah static multi-page frontend, bukan monorepo lama. Backend berada
di luar repository dan hanya terhubung melalui API. Stack aktual adalah Vanilla
JavaScript ES modules, compiled Tailwind CSS, browser Fetch/DOM, Node tests, dan
Vercel Function proxy.

## Reintegration completed

1. Product owner menyelesaikan tujuh keputusan high-risk.
2. Deployment output dipindahkan dari root ke allowlisted `dist/`.
3. 162 dokumen legacy dan 12 governance snapshot dikarantina tanpa checksum
   mismatch.
4. Frontend-only SOT, Decision Log, arsitektur, membership contract, API consumer
   contract, dan deployment contract dibentuk kembali.
5. Security/runtime defect yang teridentifikasi diremediasi dan diberi regression
   coverage.
6. Checkout pause, first-visit Light/Dark, dan Indonesian-only launch diselaraskan
   dengan keputusan product owner.
7. Maps, derived WhatsApp guidance, unsaved theme preview, serta social/catalog
   create-list-delete dilengkapi dalam batas API aktif.
8. Preview theme, rule DOCX 10 MB, dan current-user lookup mempunyai satu owner;
   duplicate scaffold dan orphan terverifikasi dibersihkan.
9. Root governance, SOT kanonis, onboarding, security, dan status disinkronkan
   kembali terhadap implementasi aktual.
10. Final re-check memvalidasi source/configuration, dependency tree, module dan
    document references, static security, deployment boundary, build, serta test.

## Confirmed implementation strengths

- Broad public/auth/member/internal route coverage.
- Central API client dengan credentials, timeout, request ID, refresh, dan CSRF.
- Sepuluh template kartu beserta registry dan responsive renderer.
- Root public-card route, QR/vCard links, safe URL helpers, dan SEO coverage.
- Billing UI sudah fail-closed selama checkout paused.
- First-visit chooser, Indonesian-only runtime, Maps, dan unsaved form preview
  sudah memiliki contract coverage.
- Resume UI memakai satu shared validator DOCX maksimal 10 MB.
- Runtime module graph memeriksa broken import, orphan module, dan shared owner.
- Vercel dan fallback Apache menetapkan baseline browser security headers yang
  sama; session storage claim hanya menerima public ID tervalidasi.
- Test suite mencakup contract, security, accessibility, routing, themes, proxy,
  dan repository-local same-origin stack.

## Remaining API-bound scope

- Edit/reorder social links dan catalog memerlukan kontrak backend yang belum
  tersedia dalam frontend consumer contract.
- Logo upload/delete memerlukan endpoint multipart dan file-policy yang disetujui.
- Admin plan/payment/theme mutations dan QR regeneration menunggu kontrak method,
  path, payload, permission, dan audit backend.

Fitur tersebut tidak boleh dibuat melalui endpoint tebakan atau otoritas browser.

## Final local re-check

| Check | Result |
|---|---|
| JavaScript syntax | PASS — 95 `.js`/`.mjs` files |
| JSON configuration | PASS — 6 parsed files |
| Dependency tree | PASS — `npm ls --depth=0` clean |
| Documentation references | PASS — 16 local Markdown references, 0 missing |
| Runtime inventory | PASS — 60 route shells, 27 controllers, 10 card templates |
| Static security scan | PASS — no potential secret or unsafe runtime DOM sink found |
| Deployment controls | PASS — allowlisted `dist/`, fail-closed proxy, Vercel/Apache headers |
| Clean QA | PASS — 154 build files, 117/117 tests |

Phase 10 menemukan satu local deployment defect: security headers sebelumnya
hanya teruji pada fallback Apache. `vercel.json` dan regression test sekarang
memastikan baseline yang sama pada host kanonis. Re-check juga menambahkan test
bahwa `sessionStorage` hanya menerima public ID claim tervalidasi.

## External validation still required

- Vercel Preview dari exact commit/artifact yang akan dipromosikan.
- Same-origin `/api/v1` smoke terhadap backend staging HTTPS yang stabil.
- Cookie, CSRF, refresh/logout, Starter claim, public slug, QR/vCard, dan Resume
  upload/download dengan role dan data uji yang sah.
- Keyboard, mobile, reduced-motion, serta Android/iOS/Safari UAT.
- Product-owner acceptance dan bukti rollback/deployment sebelum produksi.

## Assessment

Reintegrasi lokal selesai dan repository aman untuk dibuat checkpoint commit,
di-push, lalu dijadikan Vercel Preview. Production promotion belum disetujui:
external staging/deployment smoke dan human UAT di atas masih wajib diselesaikan
terhadap exact commit/artifact yang akan dipromosikan.

## 2026-09-11 backend/QR/slug audit addendum

The active backend checkout is `C:\xampp\htdocs\krtnmdgtlv2API`; the
double-`d` spelling in the implementation brief does not exist. Source audit
verified Node/Express composition, native `qrcode` PNG rendering with cache and
ETag, seven-letter cryptographic Starter allocation, binary unique slug schema,
and Starter mutation DTO exclusion. Frontend API configuration remains
`127.0.0.1:3000/api/v1` for local hosts.

Initial preflight stopped safely while MariaDB was unreachable. After XAMPP
MariaDB was started, the exact `krtnmdgtlv2` identity, binary unique slug
index, and migration history were verified; a timestamped logical backup was
created before applying the only pending additive migration, 011.

Final evidence includes 142/142 frontend tests, 156/156 non-database backend
tests, 1/1 database integration test, direct and proxied health HTTP 200, CORS
HTTP 204, a passing read-only Newman System run, and isolated `_test` Starter
E2E for exact-case slug, QR, and VCF. The temporary test record was removed by
rebuilding the test baseline. Full credentialed Postman mutations and
production/Vercel UAT remain external gates.

## 2026-09-12 owner clarification

The Starter access-model conflict is resolved: creation is anonymous, while
maintenance/editing requires a verified account and card claim. Checkout is an
intentional product pause, not an implementation ambiguity, and remains disabled
until a future explicit decision confirms Midtrans API readiness.
