# Frontend Project Structure

```text
krtnmddgtlv2FE-SOT/
├── index.html                 # landing page
├── about/, blog/, ...         # public route shells
├── login/, register/, ...     # auth/onboarding shells
├── app/                       # authenticated member shells
├── admin/                     # Super Admin shells
├── specialist/                # CV Specialist shells
├── public-card/               # root-slug public card shell
├── pages/                     # page controllers
├── services/                  # API/presentation boundaries
├── components/                # shared UI, live preview, card templates
├── validators/                # browser validation
├── utils/                     # browser utilities
├── config/                    # runtime config and theme registry
├── assets/                    # CSS, images, icons, previews
├── locales/                   # locale resources
├── api/v1/[...path].js        # Vercel backend proxy
├── scripts/build-static.mjs   # public-output allowlist
├── scripts/local-server.mjs   # local static routes and /api/v1 proxy
├── scripts/dev-server.mjs     # npm run dev entry point (127.0.0.1:8080)
├── tests/                     # native Node tests
├── docs/                      # canonical SOT and operations
├── docs/_legacy-sot/          # read-only historical archive
├── dist/                      # generated output saat build; tidak perlu disimpan lokal
├── package.json
└── vercel.json
```

## Shell and controller pairing

Route directories contain `index.html` shells. Behavior belongs in a matching
module under `pages/`. Shells may share `components/app-shell.js`, global theme
assets, validators, and service adapters.

Examples:

- `app/card/identity/index.html` → `pages/app/card-editor.js`
- `app/card/design/index.html` → `pages/app/card-design.js`
- `admin/index.html` → `pages/admin/super-admin-workspace.js`
- `public-card/index.html` → `pages/public/card.js`

Compatibility shells such as `/app/card/contact/` may redirect to a canonical
editor and are intentional when tested.

## Current inventory

- 61 route `index.html` shells.
- 28 page-controller modules under `pages/`.
- 10 allowlisted card-theme templates.
- Static build baseline: 158 runtime files in `dist/`.

Counts describe the verified Phase 10 repository and must be refreshed when the
runtime inventory changes.

## Service boundary

`services/api-client.js` owns base URL, cookie credentials, timeout, refresh,
CSRF header, request ID, and normalized errors. Feature services define endpoint
operations. Page controllers should not duplicate API transport logic.

Direct `fetch()` is reserved for static resources or specialized download
handling documented in the architecture/API contract.

Shared responsibility owners include:

- `components/card-live-preview.js` for isolated member theme previews.
- `services/auth-service.js` for current-user `GET /me` access.
- `validators/resume-file-validator.js` for DOCX-only 10 MB source validation.

Search for an existing owner before adding a module; repeated business rules must
be consolidated instead of maintained in parallel.

## Email template management

`docs/06-EMAIL-TEMPLATE-MANAGEMENT.md` records the implemented feature,
verified template inventory, and confirmed contract. The backend evidence brief
is `docs/EMAIL-TEMPLATES-BACKEND-HANDOFF.md`.

`/admin/mail/templates/`, `pages/admin/email-templates.js`,
`services/email-template-service.js`, and
`validators/email-template-validator.js` implement the editor. Existing
`/admin/mail/` remains the separate Mail Outbox surface.

## Generated and historical directories

- `dist/` and `node_modules/` are generated and ignored.
- `docs/_legacy-sot/` is immutable historical evidence.
- Empty scaffold directories do not prove a feature is implemented; use code,
  test, and `STATUS.md`.
