# Consolidated Repository Review Report — v2.0 to v2.5

Dokumen ini menggabungkan seluruh review report historis v2.0 sampai v2.5. Pernyataan status pada setiap bagian merekam kondisi repository ketika versi tersebut direview; status implementasi terkini tetap mengikuti `STATUS.md`, `CHANGELOG.md`, dan Decision Log.

## v2.0 — Implementation-ready SSOT

### Review result

Status saat review: **PASS — implementation-ready SSOT**

### Ambiguities resolved

1. Starter tanpa login tetapi dapat diedit menggunakan high-entropy manage token yang disimpan hash-only.
2. Upgrade Starter harus claim kartu ke akun sebelum checkout.
3. Satu akun memiliki satu kartu aktif pada MVP agar billing dan limit konsisten.
4. Tema dikelola melalui `themes` dan `plan_theme_access`; akses 1/3/10 tema sesuai tier.
5. VCF 3.0 menjadi default; VCF 4.0 optional.
6. Logo, katalog, social, Maps, dan WhatsApp dipisahkan dari core VCF.
7. Payment activation hanya dari verified, idempotent server-side event.
8. Token autentikasi tidak disimpan di localStorage.
9. Modular monolith dipertahankan; Redis/S3/queue hanya scale path.

### Validation performed

- Required SSOT documents present.
- No placeholder documents.
- Membership matrix contains exact locked limits.
- OpenAPI YAML parses successfully.
- Local OpenAPI references resolve.
- OpenAPI operation IDs are unique.
- SQL contains all required tables, indexes, theme access, and one-card constraint.
- ZIP integrity tested after creation.

### Remaining configurable values

- Basic/Pro prices.
- Subscription duration.
- Brand name/domain.
- SMTP and Midtrans credentials.
- Final visual content of 10 themes.

Nilai tersebut merupakan configuration/admin data dan pada saat review tidak menghalangi implementasi.

## v2.1 — Cross-layer recheck

Frontend/UI/UX, admin, backend, database, security, functions, API, tests, deployment, dan struktur project diperiksa ulang. Frontend, admin, backend, security, functions, dan structure memerlukan revisi dan telah diperbarui. Core database dan membership tidak memerlukan redesign.

Status saat review: **implementation-ready**.

## v2.2 — Public URL rules

### Files that required revision

- Frontend and UI/UX: yes.
- User setting/card settings: yes.
- Backend and routing: yes.
- Database collation/index: yes.
- Security/privacy: yes.
- QR integration: yes.
- API/OpenAPI: yes.
- Tests/UAT: yes.
- Membership model: no tier redesign required.
- Payment/admin business logic: no structural redesign required.

### Critical design findings

1. Root public URLs require a reserved-route list.
2. Starter mixed-case codes require case-sensitive database comparison and routing.
3. Phone-derived suggestions expose a phone number publicly; the UI must warn users and allow alternatives.
4. Availability checks are advisory; final save must handle concurrent collisions.
5. Changing a Basic/Pro slug changes the QR destination and may invalidate previously shared links.

### Final assessment

Perilaku URL yang diminta kompatibel dengan arsitektur yang ada setelah revisi terdokumentasi.

Status saat review: **Repository v2.2 implementation-ready**.

## v2.3 — Midtrans

Spesifikasi Midtrans Snap, backend abstraction, payment/subscription schema, webhook security/idempotency, billing UX, admin operations, API, tests, deployment, dan Codex prompt dinyatakan lengkap. Credentials sengaja tidak disertakan dan harus diberikan melalui environment variables.

Status saat review: **implementation pending**.

## v2.4 — Card themes

### Reviewed

- theme allocation;
- frontend templates;
- responsive behavior;
- user control panel editing;
- membership enforcement;
- backend theme engine;
- database schema and seeds;
- OpenAPI;
- VCF compatibility;
- security;
- admin controls;
- tests.

### Findings and resolution

#### Theme count

Resolved:

- Starter 1.
- Basic 3 cumulative.
- Pro 10 cumulative.
- Total 7 landscape and 3 portrait.

#### Data compatibility

Resolved melalui satu normalized field contract. Tidak ada theme-specific contact columns yang diperkenalkan.

#### VCF compatibility

Confirmed:

- FN/N, TITLE, ORG, WORK phone, CELL phone, EMAIL, URL, dan ADR bersumber dari `card_contacts`.
- Theme, logo, QR, social links, dan catalog tidak mengubah core VCF.

#### User editing

Ditentukan dalam `CardFieldEditor` dan `/app/card/identity`, `/app/card/contact`, `/app/card/design`.

#### Database/backend

Themes dan explicit plan access direpresentasikan dalam `themes` dan `plan_theme_access`. Backend wajib memvalidasi selected theme terhadap effective plan.

#### Security

User hanya dapat memilih allowlisted theme codes. User tidak dapat mengirim custom template paths atau markup.

### Final status

Status saat review: **Repository v2.4 compatible and ready for Codex implementation**.

## v2.5 — Official email

Domain topology, cPanel SMTP, PHP/Laravel adapter compatibility saat itu, OTP, autoreply, queue/retry, database, API, frontend, admin, security, DNS deliverability, tests, dan deployment telah direview. SMTP credentials sengaja tidak disertakan.

Status saat review: **Repository v2.5 implementation-ready**.
