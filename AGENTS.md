# AGENTS.md

Instruksi wajib untuk Codex, Copilot, Claude Code, Gemini CLI, dan developer manusia.

## Read order

1. `AI_CONTEXT.md`
2. `FILE-INDEX.md`
3. `LOCKED-PLAN.md`
4. `docs/03-MEMBERSHIP-MATRIX.md`
5. `docs/04-PRD.md`
6. Dokumen modul yang sedang dikerjakan
7. `docs/27-DECISION-LOG.md`

## Source-of-truth precedence

1. `LOCKED-PLAN.md`
2. `docs/27-DECISION-LOG.md`
3. `docs/03-MEMBERSHIP-MATRIX.md`
4. `docs/14-DATABASE-DICTIONARY.md`
5. `openapi/openapi.yaml`
6. Dokumen backend/frontend spesifik
7. Implementation plan/backlog
8. Kode lama

## Non-negotiable

- Tier hanya Starter, Basic, Pro.
- Tidak menambah fitur di luar locked scope.
- Password, edit token, refresh token, dan API key tidak boleh disimpan plaintext.
- Token autentikasi tidak boleh disimpan di `localStorage`.
- Status payment dari browser tidak dipercaya.
- Subscription hanya aktif setelah verifikasi server-side.
- Controller tipis; business logic di Service.
- SQL selalu parameterized/prepared.
- Secret tidak pernah masuk repository.
- Perubahan API wajib update OpenAPI.
- Perubahan schema wajib migration + data dictionary.

## Work protocol

Sebelum coding: nyatakan fase, daftar file, dan scope. Sesudah coding: jalankan test, laporkan file berubah, risiko, dan asumsi. Jangan lanjut fase berikut tanpa instruksi.
