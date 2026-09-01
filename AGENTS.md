# AGENTS.md

Instruksi wajib untuk AI coding agent dan developer yang bekerja pada repository
frontend KartuNamaDigital.id.

## Read order

1. `AI_CONTEXT.md`
2. `FILE-INDEX.md`
3. `LOCKED-PLAN.md`
4. `docs/02-PRODUCT-AND-MEMBERSHIP.md`
5. `docs/01-FRONTEND-ARCHITECTURE.md`
6. `docs/03-API-CONSUMER-CONTRACT.md`
7. Dokumen dan kode modul yang sedang dikerjakan
8. `docs/05-DECISION-LOG.md`
9. `STATUS.md`

## Source-of-truth precedence

1. `LOCKED-PLAN.md`
2. `docs/05-DECISION-LOG.md`
3. `docs/02-PRODUCT-AND-MEMBERSHIP.md`
4. `docs/03-API-CONSUMER-CONTRACT.md`
5. `docs/01-FRONTEND-ARCHITECTURE.md`
6. Kode dan test frontend saat ini untuk fakta implementasi
7. `STATUS.md` dan dokumen operasional
8. `docs/_legacy-sot/` hanya bukti historis, tidak pernah menjadi authority

Kontrak backend yang sebenarnya dikelola di repository backend terpisah. Dokumen
API di repository ini hanya mendefinisikan kebutuhan frontend sebagai consumer.

## Non-negotiable

- Scope repository dan SOT ini hanya frontend.
- Tier hanya `Starter`, `Basic`, dan `Pro`.
- Launch menggunakan Bahasa Indonesia; English ditunda.
- Checkout membership tetap paused sampai keputusan baru disetujui dan UI harus
  menampilkan `Under development`.
- First-visit Light/Dark chooser wajib.
- Starter dapat dibuat tanpa akun, tetapi edit mewajibkan Login/Signup dan claim
  ke akun terverifikasi.
- Upload Resume Enhancement hanya DOCX maksimal 10 MB.
- Authentication token, edit token, refresh token, dan API key tidak boleh
  disimpan di `localStorage` atau `sessionStorage`.
- Browser tidak boleh menentukan atau mempercayai status payment.
- Secret tidak pernah masuk repository atau bundle browser.
- Semua request API memakai boundary `services/api-client.js` kecuali fetch aset
  statis yang terdokumentasi.
- Unsafe cookie-authenticated request wajib memakai konteks CSRF yang benar.
- Data tidak tepercaya dirender dengan safe DOM APIs, bukan `innerHTML`.
- Perubahan endpoint atau payload frontend wajib memperbarui
  `docs/03-API-CONSUMER-CONTRACT.md` dan test kontrak terkait.
- Output deployment statis hanya berasal dari allowlist `dist/`.
- Tidak menambah fitur di luar locked scope.

## Work protocol

Sebelum membuat struktur atau abstraksi baru, periksa implementasi, reference
graph, dan owner tanggung jawab yang sudah ada. Cari ekuivalen terlebih dahulu;
business rule yang sama tidak boleh mempunyai implementasi paralel.

Sinkronisasi repository wajib mengikuti aturan berikut:

- Perubahan business rule memperbarui authority terkait dan Decision Log bila
  keputusan product owner berubah.
- Perubahan arsitektur memperbarui `docs/01-FRONTEND-ARCHITECTURE.md`,
  `PROJECT-STRUCTURE.md`, dan peta turunan bila terdampak.
- Perubahan API memperbarui service/consumer terkait,
  `docs/03-API-CONSUMER-CONTRACT.md`, dan test kontraknya.
- `FILE-INDEX.md` selalu mengikuti kenyataan repository dan tidak pernah menjadi
  authority arsitektur atau produk.
- Kode, test, dan SOT harus diserahkan dalam keadaan saling konsisten.

Sebelum perubahan:

1. Nyatakan fase, scope, dan daftar file.
2. Periksa status Git dan pertahankan perubahan pengguna yang tidak terkait.
3. Pisahkan fakta SOT, fakta implementasi, dan asumsi.

Sesudah perubahan:

1. Jalankan build dan test yang proporsional dengan risiko.
2. Laporkan file berubah, hasil validasi, risiko, dan asumsi.
3. Jangan lanjut ke fase berikutnya tanpa instruksi product owner.

Jangan memodifikasi snapshot di `docs/_legacy-sot/`. Keputusan lama hanya dapat
diadopsi kembali melalui Decision Log kanonis.
