# Repository Status

| Area | Status |
|---|---|
| Vision/business | Complete |
| Membership | Complete and locked |
| PRD/scope | Complete and locked |
| User flows | Complete |
| UI/design specification | Complete; Phase 6QA integrated frontend QA/security pass accepted |
| Domain/database specification | Phase 8G baseline complete; 21-table modular architecture now includes CR-003 append-only user feedback; migration 004 applied and verified locally |
| ERD/reference SQL | Reconciled and verified against isolated MariaDB |
| API contract | Reconciled; `/me` contract drift cleanup implemented |
| Security specification | Complete; foundation controls implemented, feature controls pending |
| Frontend/backend architecture | Complete |
| Test/UAT/deployment | Phase 8L local security/release gate passes; 8H–8J local packages revalidated, but remote staging is blocked by missing staging DNS/cPanel evidence and an exposed production directory index |
| Application code | Browser runtime and root public-card routing defects fixed with regression coverage; no production promotion |

Repository v2.5.1 adalah **reconciled implementation baseline**, bukan aplikasi siap produksi.

| Area lanjutan | Status |
|---|---|
| QR rendering | Backend PNG implementation accepted; Android/iPhone UAT pending |
| Public URL/slug rules | Root public shell implemented; local Chrome Starter/Basic/Pro plus negative-slug QA passed; real-device UAT pending |
| Midtrans membership upgrade | Backend checkout/webhook/reconciliation accepted; sandbox/live UAT pending |
| Ten card themes | Runtime compositions and all ten picker previews synchronized without tier labels; approved P5/P6/P7 portrait visuals realigned; 1/3/10, B2/P3 save, long/empty fields, logo boundary, QR/VCF, and no-label rendering passed; real-device UAT pending |
| Official cPanel SMTP and OTP | Nodemailer adapter and registration OTP implemented; live SMTP verification pending |
| Shared user workspace / feedback | CR-003 implemented locally: consistent responsive sidebar across ten pages, reduced-motion-aware transitions, and CSRF-protected 300-character feedback intake; product-owner visual acceptance approved 2026-07-30 |

## Implementation phases

| Phase | Status |
|---|---|
| Phase 0 — SOT reconciliation | Complete |
| Phase 1 — Historical PHP foundation | Evidence retained; runtime files removed after parity acceptance |
| Phase 1M — Node/Express migration | Accepted; cleanup and regression complete |
| Phase 2A — Auth security primitives/DTO | Accepted |
| Phase 2B — Auth/OTP repositories and endpoints | Accepted |
| Phase 2C — Starter create/manage/claim | Accepted |
| Phase 2 overall | Accepted; Git checkpoint approved |
| Phase 3A — Card Core foundation | Accepted |
| Phase 3B — Card CRUD/ownership/persistence | Accepted |
| Phase 3C — Slug/theme/publish/public | Accepted |
| Phase 3 overall | Accepted |
| Phase 4A — VCF 3.0 | Accepted |
| Phase 4B — QR PNG | Accepted |
| Phase 4C — Social/catalog CRUD | Accepted |
| Phase 4D — Logo/Maps/WhatsApp/public aggregate | Accepted |
| Phase 4 overall | Accepted |
| Phase 5A — Payment gateway/security foundation | Accepted |
| Phase 5B — Checkout persistence/payment history | Accepted |
| Phase 5C — Verified webhook/subscription activation | Accepted |
| Phase 5D — Reconciliation/subscription/admin | Accepted |
| Phase 5 overall | Accepted |
| Phase 6A — Frontend foundation/API client | Accepted |
| Phase 6B — Auth and Starter onboarding UI | Accepted |
| Phase 6C — Dashboard shell and app navigation | Accepted |
| Phase 6D — Card identity/contact editor | Accepted |
| Phase 6E — Card settings, slug, publish, QR panel | Accepted |
| Phase 6F — Theme picker and design panel | Accepted |
| Phase 6G — Social and catalog editor | Accepted |
| Phase 6H — Billing and payment UI | Accepted |
| Phase 6I — Account security UI | Accepted |
| Phase 6QA — Integrated frontend QA/security pass | Accepted |
| Phase 7A — Release readiness package | Accepted |
| Phase 7B — Manual UAT/environment readiness gate | Accepted |
| Phase 7C — Vercel preview preflight | Preview deployed; public UAT blocked by Vercel SSO protection |
| Phase 7D — Protected preview smoke | Passed; superseded by Phase 7E public access unblock |
| Phase 7E — Public preview access unblock | Accepted |
| Phase 7F — Browser/device UAT | In progress; automated public preview/API smoke passed; `/plans` and Starter public drifts fixed |
| Phase 7G — UAT runtime stabilization | Checkpointed and pushed; fresh tunnel preview smoke passed |
| Phase 7H — Manual browser/device UAT runbook | Product-owner acceptance approved 2026-07-30; production-grade Safari/iOS/Android evidence remains required at remote staging |
| Phase 7I — Vercel Git integration hardening | Checkpointed and pushed; Git deploy settings hardened |
| Phase 7J — Public access unblock | Historical pass; Vercel deployment path retired after Phase 8E |
| Phase 7K — Stable backend staging | Blocked; stable HTTPS backend origin not available |
| Phase 7L — End-to-end UAT | Blocked by Phase 7K |
| Phase 7M — Production readiness/security final | No-go; local automated checks passed, environment gates blocked |
| Phase 7N — Production deployment decision | No-go for full production |
| Phase 7 | Reached production no-go decision |
| Phase 8A — Stable backend staging provisioning package | Ready for infrastructure input; no live backend deployed |
| Phase 8B — Backend staging deployment runbook | Ready for hosting details; deployment not executed |
| Phase 8C — Shared hosting compatibility assessment | Superseded by Phase 8D after Node.js feature was confirmed |
| Phase 8D — Shared hosting Node.js readiness checklist | Superseded; CR-007 requires fresh effective Node.js 22.18+ application evidence |
| Phase 8E — Shared hosting deployment dry-run | Complete at planning/recheck level; Vercel-specific active setup removed; no live server execution |
| Phase 8F — Shared hosting preflight package | Node 22.23 local typecheck/test pass; effective cPanel Node.js 22.18+ execution pending |
| Phase 8G — Database/CRUD modular architecture | Complete; dictionary/provisioning/contract gates and disposable MariaDB integration passed |
| Phase 8H — Shared-hosting backend staging deployment | Reopened; local manifest/checksum/preflight pass, remote cPanel/Passenger/database execution blocked |
| Phase 8I — Frontend shared hosting/API routing | Reopened; tracked Node 22 local same-origin runner and route matrix pass, remote verification awaits staging DNS and provider Passenger/proxy mapping |
| Phase 8J — Postman E2E CRUD/UAT | Reopened; JSON/coverage/Newman health gates pass locally, full disposable remote CRUD E2E blocked by 8H/8I |
| Phase 8K — SMTP/mail worker/Midtrans sandbox | Local hardening ready; live SMTP/cron/Midtrans pending credentials and staging |
| Phase 8L — QA/security/backup/rollback | Local code/security/release gate complete; provider-side backup/rollback rehearsal pending |
| Phase 8M — Production decision | Complete decision: NO-GO; ready to execute shared-hosting staging gates |
| Pre-8F remote — Frontend visual/SEO revision | Owner-reviewed landing wording/badge revision and local responsive Chrome QA passed |
| Local E2E UI QA | Complete; 11 Chrome scenarios passed across auth, tiers, reversible CRUD, QR/VCF, and responsive layouts |
| Public root-card defect fix | Complete locally; 41 frontend tests and 6 Chrome root-card scenarios passed |
| Ten-card visual template implementation | Complete locally; 44 frontend tests plus desktop/mobile stress-content visual QA passed |
| Local card-theme integration QA | Complete; 16/16 Chrome assertions passed and every mutable QA fixture/cache artifact was restored |
| Phase 9 — Resume Enhancement and RBAC | Local implementation and Phase 9QA complete; cPanel staging, external malware scanner, cron, SMTP, backup/restore, and real-device evidence remain production gates |

Phase 2C implements anonymous Starter create, seven-letter mixed-case slug allocation, Starter theme authority, hash-only manage access with per-edit rotation, CSRF-bound updates, and transactional claim/one-card enforcement. The product owner accepted Phase 2C and closed Phase 2 on 2026-07-18. Payment and later card modules remain unstarted; Phase 3 requires a separate explicit approval.
