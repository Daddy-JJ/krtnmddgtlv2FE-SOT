import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const themeScript = await readFile(new URL('../assets/js/site-theme.js', import.meta.url), 'utf8');
const themeStyles = await readFile(new URL('../assets/css/site-theme.css', import.meta.url), 'utf8');
const appStyles = await readFile(new URL('../assets/css/app.css', import.meta.url), 'utf8');
const loginPage = await readFile(new URL('../login/index.html', import.meta.url), 'utf8');
const registerPage = await readFile(new URL('../register/index.html', import.meta.url), 'utf8');
const landingContentPage = await readFile(new URL('../admin/landing-content/index.html', import.meta.url), 'utf8');
const billingPage = await readFile(new URL('../app/billing/index.html', import.meta.url), 'utf8');
const designPage = await readFile(new URL('../app/card/design/index.html', import.meta.url), 'utf8');
const identityPage = await readFile(new URL('../app/card/identity/index.html', import.meta.url), 'utf8');

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules') continue;
    const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
    if (entry.isDirectory()) files.push(...await collect(url));
    else if (entry.name.endsWith('.html')) files.push(url);
  }
  return files;
}

test('every substantive frontend shell except public card loads the global theme assets', async () => {
  const files = await collect(new URL('../', import.meta.url));
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    if (!/<body\b/i.test(html) || file.pathname.endsWith('/public-card/index.html')) continue;
    assert.match(html, /href="\/assets\/css\/site-theme\.css"/, file.pathname);
    assert.match(html, /src="\/assets\/js\/site-theme\.js"/, file.pathname);
  }
});

test('theme controller requires an accessible first-visit choice and keeps one safe preference key', () => {
  assert.match(themeScript, /knd\.theme\.preference/);
  assert.match(themeScript, /localStorage\.getItem\(storageKey\)/);
  assert.match(themeScript, /localStorage\.setItem\(storageKey, theme\)/);
  assert.doesNotMatch(themeScript, /token|password|credential|innerHTML|outerHTML/i);
  assert.match(themeScript, /dataSiteThemeToggle|siteThemeToggle/);
  assert.match(themeScript, /dataSiteThemeChooser|siteThemeChooser/);
  assert.match(themeScript, /createElement\('dialog'/);
  assert.match(themeScript, /Pilih tampilan Anda/);
  assert.match(themeScript, /aria-labelledby/);
  assert.match(themeScript, /aria-describedby/);
  assert.match(themeScript, /addEventListener\('cancel'[\s\S]*preventDefault/);
  assert.match(themeScript, /siteThemeChoice/);
  assert.match(themeScript, /themeChoice\('light'/);
  assert.match(themeScript, /themeChoice\('dark'/);
  assert.match(themeScript, /chooser\.remove\(\)/);
  assert.match(themeScript, /'#141414'/);
  assert.match(themeScript, /'#e4e3e0'/);
});

test('theme stylesheet covers light, dark, public, auth, user, and admin shells', () => {
  assert.match(themeStyles, /html\[data-site-theme="light"\]/);
  assert.match(themeStyles, /html\[data-site-theme="dark"\]/);
  assert.match(themeStyles, /\.mono-page/);
  assert.match(themeStyles, /\.marketing-shell/);
  assert.match(themeStyles, /\.auth-shell/);
  assert.match(themeStyles, /\.dashboard-shell/);
  assert.match(themeStyles, /\.site-theme-chooser/);
  assert.match(themeStyles, /\.site-theme-chooser__choice:focus-visible/);
  assert.match(themeStyles, /prefers-reduced-motion: reduce/);
  const shadowValues = [...themeStyles.matchAll(/box-shadow:\s*([^;]+)/g)].map((match) => match[1].trim());
  assert.ok(shadowValues.every((value) => value.startsWith('none')));
});

test('light workspace palette overrides legacy dark utility surfaces consistently', () => {
  assert.match(appStyles, /html:not\(\[data-site-theme="light"\]\) \.app-shell-page \.app-shell__main \.bg-white/);
  assert.match(appStyles, /html:not\(\[data-site-theme="light"\]\) \.app-shell-page \.app-shell__main input/);
  assert.match(appStyles, /html:not\(\[data-site-theme="light"\]\) \.app-shell-page \.app-shell__main \.text-slate-600/);
  assert.match(themeStyles, /\.dashboard-shell \.theme-option,[\s\S]*background:\s*var\(--site-surface\)\s*!important;[\s\S]*color:\s*var\(--site-ink\)\s*!important/s);
  assert.match(themeStyles, /\.dashboard-shell \.theme-option\[aria-pressed="true"\]/);
  assert.match(themeStyles, /html\[data-site-theme="light"\] \.dashboard-shell \[data-form-status\]\s*\{[^}]*color:\s*var\(--site-ink\)\s*!important/s);
  assert.match(themeStyles, /html\[data-site-theme="light"\] \.dashboard-shell \[data-form-status\]\[data-tone="error"\]\s*\{[^}]*color:\s*var\(--site-danger\)\s*!important/s);
});

test('login and register header CTAs use theme tokens instead of static color utilities', () => {
  assert.match(loginPage, /href="\/register\/" class="auth-header__cta"/);
  assert.match(registerPage, /href="\/login\/" class="auth-header__cta"/);
  assert.match(themeStyles, /\.auth-header \.auth-header__cta\s*\{[^}]*background:\s*var\(--site-ink\)[^}]*color:\s*var\(--site-inverse\)/s);
  assert.match(themeStyles, /\.auth-header \.auth-header__cta:hover\s*\{[^}]*background:\s*transparent[^}]*color:\s*var\(--site-ink\)/s);
});

test('admin landing editor uses the dashboard shell and preserves inverse action contrast', () => {
  assert.match(landingContentPage, /<body class="dashboard-shell min-h-screen">/);
  assert.match(themeStyles, /\.auth-secondary,[\s\S]*color:\s*var\(--site-ink\)\s*!important/);
  assert.match(themeStyles, /\.auth-panel a\[class\*="bg-slate-900"\],[\s\S]*color:\s*var\(--site-inverse\)\s*!important/);
  assert.match(themeStyles, /\.auth-panel input,[\s\S]*background:\s*var\(--site-surface\)\s*!important;[\s\S]*color:\s*var\(--site-ink\)\s*!important/);
});

test('global shell implements the approved technical brutalist editorial tokens', () => {
  assert.match(themeStyles, /--site-paper:\s*#e4e3e0/i);
  assert.match(themeStyles, /--site-ink:\s*#141414/i);
  assert.match(themeStyles, /--site-accent:\s*#f27d26/i);
  assert.match(themeStyles, /--site-success:\s*#065f46/i);
  assert.match(themeStyles, /--site-danger:\s*#9f1239/i);
  assert.match(themeStyles, /--site-font-mono:/);
  assert.match(themeStyles, /--site-font-editorial:/);
  assert.match(themeStyles, /\.dashboard-shell thead\s*\{[^}]*background:\s*var\(--site-ink\)/s);
  assert.match(themeStyles, /\.dashboard-shell td\s*\{[^}]*border-top:\s*1px solid var\(--site-line\)/s);
  assert.match(themeStyles, /\.mono-button--dark:hover[^{]*\{[^}]*background:\s*var\(--site-accent\)/s);
  assert.match(themeStyles, /dialog::backdrop\s*\{[^}]*rgb\(20 20 20 \/ 70%\)/s);
  assert.match(themeStyles, /\.site-hero h1,[\s\S]*font-size:\s*2rem !important/);
});

test('workspace feature surfaces reuse the global brutalist primitives in both themes', () => {
  const billingStart = appStyles.indexOf('/* Billing:');
  const billingEnd = appStyles.indexOf('.dashboard-link,', billingStart);
  const billingLayout = appStyles.slice(billingStart, billingEnd);
  assert.doesNotMatch(billingLayout, /#[0-9a-f]{3,8}|rgba?\(|gradient\(|border-radius|box-shadow|filter:/i);
  assert.match(billingPage, /class="dashboard-panel billing-plan billing-plan--locked p-5"/);
  assert.match(billingPage, /class="dashboard-panel billing-notify mt-4"/);
  assert.match(billingPage, /class="billing-plan__badge" data-status-badge/);
  assert.match(designPage, /class="dashboard-action min-h-11/);
  assert.match(designPage, /class="workspace-frame mt-4 p-3"/);
  assert.match(identityPage, /class="dashboard-panel space-y-8 p-5 sm:p-7"/);
  assert.match(identityPage, /class="dashboard-panel card-editor-preview-panel/);
  assert.match(themeStyles, /\.dashboard-shell :is\(form, section, article, aside, div, label\)\[class\*="rounded-"\]/);
  assert.match(themeStyles, /\.dashboard-shell \.billing-plan--locked\s*\{[^}]*filter:\s*none;[^}]*opacity:\s*1;/s);
  assert.match(themeStyles, /\.dashboard-shell \.theme-option__preview,[\s\S]*background:\s*var\(--site-surface-strong\)/s);
});
