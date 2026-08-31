# Project Structure

```text
digital-identity-platform-v2.5.1/
├── root governance files
├── docs/
│   ├── 00-30 product/engineering docs
│   ├── backend/
│   └── frontend/
├── openapi/openapi.yaml
├── database/schema-reference.sql
├── backend/ Node.js + Express.js + TypeScript application
├── frontend/ scaffold
├── prompts/
├── templates/
└── .github/
```

## v2.1 additions
`backend/src/modules/rendering/qr/`, `backend/src/modules/rendering/vcard/`, `backend/storage/cache/qr/`, `frontend/components/QRPanel/`, `frontend/components/QRDialog/`.

## v2.2 slug additions

```text
docs/backend/18-SLUG-URL-SPEC.md
frontend/components/SlugField/
frontend/components/SlugChangeDialog/
backend/src/modules/cards/services/starter-slug-generator.ts
backend/src/modules/cards/services/slug-suggestion-service.ts
backend/src/modules/cards/services/slug-availability-service.ts
```

## v2.4 card-theme additions

```text
frontend/
├── config/theme-registry.json
├── assets/css/card-themes.css
├── assets/images/themes/                 # 10 previews
├── components/card-themes/               # 10 templates
├── components/ThemePicker/
├── components/CardFieldEditor/
└── services/card-theme-renderer.js

backend/src/modules/themes/
database/seeds/002-card-themes.sql
docs/33-CARD-THEME-CATALOG.md
docs/backend/22-THEME-ENGINE-SPEC.md
docs/frontend/12-CARD-THEME-EDITOR.md
prompts/11-CARD-THEME-IMPLEMENTATION.md
```

## v2.5 official email
`docs/34-OFFICIAL-EMAIL-ARCHITECTURE.md`, `docs/35-CPANEL-MAIL-SETUP-CHECKLIST.md`, `docs/backend/23-EMAIL-OTP-SPEC.md`, `docs/backend/24-TRANSACTIONAL-EMAIL-SPEC.md`, `docs/frontend/13-EMAIL-OTP-UX.md`, `backend/src/modules/email/`, `backend/resources/mail/`, and `prompts/12-OFFICIAL-EMAIL-OTP.md`.
