# Security Policy

Laporkan kerentanan melalui kanal privat.

- Gunakan `.env`; jangan commit credential.
- TLS wajib production.
- Secure, HttpOnly, SameSite cookies.
- Password Argon2id bila tersedia.
- Token disimpan hash-only.
- Query prepared statement.
- Upload allowlist dan server-side inspection.
- Webhook payment diverifikasi dan idempotent.
