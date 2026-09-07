import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const files = [
  'index.html',
  'about/index.html',
  'contact/index.html',
  'faq/index.html',
  'privacy/index.html',
  'cookies/index.html',
  'terms/index.html',
  'refund/index.html',
  'register/index.html',
  'login/index.html',
  'verify-email/index.html',
  'forgot-password/index.html',
  'reset-password/index.html',
  'create/index.html',
  'starter/manage/index.html',
  'app/index.html',
  'app/card/identity/index.html',
  'app/card/contact/index.html',
  'app/card/settings/index.html',
  'app/card/design/index.html',
  'app/card/social/index.html',
  'app/card/catalog/index.html',
  'app/billing/index.html',
  'app/account/index.html',
  'public-card/index.html',
  'pages/public/home.js',
  'pages/public/card.js',
  'pages/auth/register.js',
  'pages/auth/login.js',
  'pages/auth/verify-email.js',
  'pages/auth/forgot-password.js',
  'pages/auth/reset-password.js',
  'pages/starter/create.js',
  'pages/starter/manage.js',
  'pages/app/dashboard.js',
  'pages/app/card-editor.js',
  'pages/app/card-settings.js',
  'pages/app/card-design.js',
  'pages/app/card-content.js',
  'pages/app/billing.js',
  'pages/app/account.js',
  'services/api-client.js',
  'services/auth-service.js',
  'services/starter-service.js',
  'services/dashboard-service.js',
  'services/card-service.js',
  'services/content-service.js',
  'services/payment-service.js',
  'services/card-theme-renderer.js',
  'services/public-card-presenter.js',
  'utils/safe-url.js',
  'services/i18n.js',
  'validators/auth-validator.js',
  'validators/starter-validator.js',
  'validators/card-validator.js',
  'validators/slug-validator.js',
  'validators/theme-validator.js',
  'validators/content-validator.js',
  'validators/payment-validator.js',
  'components/forms/form-utils.js',
  'pages/admin/email-templates.js',
  'pages/admin/super-admin-workspace.js',
  'services/email-template-service.js',
  'validators/email-template-validator.js',
  'admin/mail/templates/index.html',
];

test('frontend foundation contains no token storage or unsafe DOM sinks', async () => {
  for (const file of files) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /localStorage|sessionStorage|\.innerHTML\s*=|\.outerHTML\s*=/);
    assert.doesNotMatch(source, /\son(?:click|load|error)\s*=/i);
  }
});

test('public shell has semantic and keyboard accessibility landmarks', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<nav\b[^>]*aria-label=/);
  assert.match(html, /<main\b[^>]*id="main"/);
  assert.match(html, /class="skip-link"[^>]*href="#main"/);
  assert.match(html, /<script\b[^>]*type="module"/);
});
