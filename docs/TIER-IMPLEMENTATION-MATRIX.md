# Tier Implementation Matrix

Updated: 2026-09-12

Backend evidence paths are relative to the canonical sibling repository
`C:\xampp\htdocs\krtnmdgtlv2API`. Database evidence was verified against
the exact local `krtnmdgtlv2` schema after backup and migration; HTTP mutation
smoke used only the isolated `_test` database.

| Fitur | Starter | Basic | Pro | Frontend Evidence | API Evidence | DB Evidence | Authorization Evidence | Test Evidence | Status | Gap/Conflict |
| ----- | ------- | ----- | --- | ----------------- | ------------ | ----------- | ---------------------- | ------------- | ------ | ------------ |
| Login/member area | Not required to create; required to manage/edit | Yes | Yes | `starter/manage/`, `register/`, `app/` | `starter/access`, `signup-context`, `claim`, `auth/*` | `users`, `cards.user_id` in migration 001 | Starter management cookie, verified account, then claim; account session for Basic/Pro | backend `starter-http.test.ts`, `starter-email.test.ts`; frontend signup tests | Verified | FE-D-016 confirms anonymous creation and account-bound management |
| Public URL | Random 7 letters | Custom | Custom | `public-card/index.html`, `pages/app/card-settings.js` | `GET /public/cards/:slug`, custom slug routes | `cards.slug` binary unique in migration 001 and live schema | Starter DTO excludes slug; SQL update permits Basic/Pro only | `starter-slug.test.ts`, `custom-slug.test.ts`, `card-http.test.ts`; isolated HTTP E2E | Verified | Starter exact case returned 200 and changed case returned 404 |
| QR Code | Yes | Yes | Yes | public QR action uses configured API base | `GET /public/cards/:slug/qr`; `rendering/qr/` | N/A (content-addressed file cache, no QR table) | Published/active public card lookup; rate limit | `qr-rendering.test.ts`, `qr-http.test.ts`, frontend public route tests; HTTP 200/304 smoke | Verified | PNG unit decode equals the exact canonical URL |
| Template kumulatif | 1 | 3 | 10 | `config/theme-registry.json` | card theme catalog/update routes | `themes`, `plan_theme_access` | plan capability/theme access query | backend database integration test; frontend theme tests | Verified | Design UAT remains separate from entitlement verification |
| Edit informasi | Yes, after Signup/claim | Yes | Yes | Starter manage and member card editor | Starter PUT and `PUT /cards/:publicId` | `card_contacts` | management cookie+CSRF or account ownership+CSRF | `starter-http.test.ts`, `starter-email.test.ts`; database integration test | Verified | Anonymous editing is not allowed |
| Logo perusahaan | No | No | Yes | public renderer accepts `logoUrl` | public logo and owner logo routes | `cards.logo_path` | Pro-only service and SQL update | `phase-4d-logo-public.test.ts`; database integration test | Verified | Browser multipart UAT remains external |
| Google Maps | No | Yes | Yes | card editor Maps field | `PUT /cards/:publicId` | `card_contacts.maps_url` | `maps_enabled` capability | backend `card-core.test.ts`; frontend validator tests; database integration test | Verified | N/A |
| Social media | 0 | Max. 2 | Maks. 5 | social editor | card social routes | social table plus `social_link_limit` | server-side plan limit | `card-content.test.ts`; database integration test | Verified | Edit/reorder UX is outside this limit-enforcement claim |
| Katalog | 0 | Maks. 2 | Maks. 10 | catalog editor | card catalog routes | catalog table plus `catalog_item_limit` | server-side plan limit | `card-content.test.ts`; database integration test | Verified | Edit/reorder UX is outside this limit-enforcement claim |
| Click-to-WhatsApp | No | No | Yes | `pages/public/card.js` | public aggregate `whatsappUrl` | `plan_features`; applied migration 011 | backend derives only when `planCode=pro` | backend `card-core.test.ts`; frontend public-card tests; database integration test | Verified | Prior all-tier decision is superseded |
| vCard/VCF | Yes | Yes | Yes | public VCF action | `GET /public/cards/:slug/vcard` | N/A | published card lookup | backend `vcard-http.test.ts`, `vcard-rendering.test.ts`; HTTP 200 smoke | Verified | N/A |
| Upgrade/payment | Planned | Planned | No upgrade target | billing surface is paused | checkout/history/reconcile routes exist but are not called by paused UI | payments and subscriptions tables | authenticated transition and gateway verification | backend payment tests; frontend billing contract | Blocked | Intentionally paused until a later owner decision confirms Midtrans API readiness |
| Resume Enhancement | No | No | Pro | member and internal resume pages | resume service route families | migration 004 resume tables | Pro eligibility, assigned specialist, service admin | backend resume tests; frontend resume tests; database integration test | Verified | Real DOCX delivery/mailbox UAT remains external |

## Resume rules retained

Existing source retains Pro-only eligibility, one beneficiary per subscription
period, maximum three revisions, `cv_specialist`, SLA `2 x 24 jam kerja`, DOCX
output, 90-day input/output retention, member countdown, and `super_admin`
oversight. Automated database/file-policy verification passes; real designated
mailbox delivery and human DOCX acceptance remain external UAT.
