# Backend handoff: editable transactional email templates

Prepared: 2026-09-06. Stage 2 backend implementation and local activation
completed after explicit owner approval. Migration 010 is applied and the
feature flag is enabled; no real email was sent.

## Stage 2 return package

- All API paths and structured schema in the frontend specification were adopted.
- Fixed seven-key catalog, strict validation, safe HTML plus text rendering,
  draft revisions, immutable published versions, restore-to-draft, Super Admin
  guard, access CSRF, recent-auth, UUID idempotency, and rate-limited actor-owned
  test email queue are implemented.
- Existing Starter, OTP, password reset, Resume completion, and 30/7/1-day
  retention producers use the shared renderer. New outbox jobs pin a published
  version; version 0/null retains the built-in legacy baseline.
- Default-off `EMAIL_TEMPLATES_ENABLED` protected API/table use before migration;
  it is enabled in the local runtime after migration 010.
- Backend QA: typecheck passed; 143 unit/HTTP tests passed with one DB test skipped
  in the ordinary suite; the same database integration test passed separately on
  the guarded `_test` database; npm audit reported two moderate and no high
  vulnerabilities. Main migration status is now 010=true.
- Backend operational contract: `C:/xampp/htdocs/krtnmdgtlv2API/docs/EMAIL-TEMPLATES.md`.

Frontend Stage 3 and local automated/routing QA are complete. Remaining external
gates are authenticated Super Admin mutation checks and mailbox UAT with an
explicitly designated recipient.

## Completed Stage 2 brief (historical)

Work in `C:/xampp/htdocs/krtnmdgtlv2API`. Read its own AGENTS/SOT and inspect Git
status first; preserve existing changes. Read the frontend specification at
`C:/xampp/htdocs/krtnmddgtlv2FE-SOT/docs/06-EMAIL-TEMPLATE-MANAGEMENT.md`.
It is the single proposal for editor fields and API shapes, not backend OpenAPI.

Implement backend-owned, versioned transactional email templates so Super Admin
can change welcome wording and formatting without editing source code.

1. Recheck the seven-entry inventory, current mailer/outbox/retry ownership, and
   backend auth/CSRF/recent-auth/audit conventions. Reuse these components.
2. Confirm or return corrections to the initial endpoint/schema/error contract
   before frontend integration. Explicitly settle keys, content limits, revision
   conflicts, test-job status, idempotency, recent-auth, and legacy queue versioning.
3. Add reversible migrations and seed existing content without sending mail or
   modifying cards/accounts. Keep drafts and immutable published versions separate.
4. Implement a shared validated HTML+text renderer and wire Starter, OTP,
   password reset, Resume completion, and all three retention reminders. Existing
   sender/SMTP settings and trigger schedules remain unchanged.
5. Add super_admin-only list/detail/draft/preview/test/status/publish/history/
   restore operations. Use dummy-only previews/tests and actor-owned verified
   recipient; no new token issuance in test sends. Preserve outbox operations.
6. Cover security, delivery fallback, version pinning, atomic publish/audit,
   concurrency, and duplicate-send prevention in backend tests. Verify API health
   and credentialed CORS for frontend `http://127.0.0.1:8080`.
7. Update backend OpenAPI/docs and provide sanitized request/response examples
   and test results. Do not share .env, credentials, real tokens, or customer data.

Do not activate checkout, introduce marketing campaigns, redesign auth, add
Starter resend/recovery, change the create payload/access token contract, or
alter the production frontend proxy. Real SMTP tests require an explicitly
designated mailbox and report any test jobs/records left behind.

## Returned package used by frontend Stage 3

- Confirmed methods/paths, schemas, variable and asset catalog, and limits.
- Authorization/CSRF/recent-auth error codes and test-send rate-limit policy.
- Revision/idempotency behavior including timeouts and two-editor conflicts.
- Legacy queue migration and rollback strategy, with published-version behavior.
- Evidence that all seven template entries use the shared renderer; no remaining
  hardcoded subject/body bypass in active user-facing delivery paths.
- Backend test/health/CORS results; mailbox test status stated separately.

Frontend Stage 3 consumed this package on 2026-09-06.
