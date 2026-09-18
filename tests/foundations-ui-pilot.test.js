import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

const cssFiles = [
  '../assets/css/foundations-tokens.css',
  '../assets/css/foundations-typography.css',
  '../assets/css/foundations-primitives.css',
];
const css = (await Promise.all(cssFiles.map((path) =>
  readFile(new URL(path, import.meta.url), 'utf8')
))).join('\n');
const pilotPages = [
  '../about/index.html',
  '../faq/index.html',
  '../contact/index.html',
  '../login/index.html',
  '../app/index.html',
  '../app/account/index.html',
  '../admin/index.html',
];

async function collectVisibleRouteShells(directory = new URL('../', import.meta.url), relative = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const shells = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (['.git', 'dist', 'node_modules'].includes(entry.name)) continue;
      shells.push(...await collectVisibleRouteShells(
        new URL(`${entry.name}/`, directory),
        `${relative}${entry.name}/`,
      ));
      continue;
    }

    if (entry.name !== 'index.html' || relative === 'public-card/') continue;
    const html = await readFile(new URL(entry.name, directory), 'utf8');
    if (html.includes('<main')) shells.push({ path: `${relative}${entry.name}`, html });
  }

  return shells;
}
test('approved pilot and Contact routes load the scoped Foundations adapter', async () => {
  for (const path of pilotPages) {
    const html = await readFile(new URL(path, import.meta.url), 'utf8');
    assert.match(html, /foundations-tokens\.css/, path);
    assert.match(html, /foundations-typography\.css/, path);
    assert.match(html, /foundations-primitives\.css/, path);
    assert.match(html, /ui-foundations/, path);
  }
});

test('layout normalization owns marketing, auth, app shell, and admin spacing', async () => {
  const tokens = await readFile(
    new URL('../assets/css/foundations-tokens.css', import.meta.url),
    'utf8',
  );
  const primitives = await readFile(
    new URL('../assets/css/foundations-primitives.css', import.meta.url),
    'utf8',
  );

  assert.match(tokens, /--fdn-space-1:/);
  assert.match(tokens, /--fdn-space-8:/);
  assert.match(tokens, /--fdn-section-gap:/);
  assert.match(tokens, /--fdn-reading: 56rem/);
  assert.match(primitives, /\.ui-foundations \.site-hero::after[\s\S]*content: none !important/);
  assert.match(primitives, /\.ui-foundations \.site-panel::before[\s\S]*content: none !important/);
  assert.match(primitives, /\.ui-foundations \.site-content[\s\S]*margin-top: var\(--fdn-section-gap\)/);
  assert.match(primitives, /\.auth-panel/);
  assert.match(primitives, /\.app-shell__layout/);
  assert.match(primitives, /\[data-admin-root\]/);
});

test('editorial marketing headings use a compact desktop scale', async () => {
  const typography = await readFile(
    new URL('../assets/css/foundations-typography.css', import.meta.url),
    'utf8',
  );
  assert.match(typography, /\.ui-foundations\.editorial h1[\s\S]*var\(--fdn-type-page-title\)/);
  assert.match(typography, /\.ui-foundations\.editorial \.fdn-display[\s\S]*var\(--fdn-type-page-title\)/);
  assert.match(css, /--fdn-type-page-title: clamp\(1\.75rem, 3vw, 2\.25rem\)/);
});

test('public card rendering stays outside the pilot adapter', async () => {
  const publicCard = await readFile(
    new URL('../public-card/index.html', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(publicCard, /foundations-(tokens|typography|primitives)\.css/);
  assert.doesNotMatch(css, /\.public-card|\.digital-card|\.card-theme|\.theme-(starter|basic|pro)/);
});

test('marketing recipes use semantic type roles, cards, and native FAQ disclosure', async () => {
  const [about, contact, faq] = await Promise.all([
    readFile(new URL('../about/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../contact/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../faq/index.html', import.meta.url), 'utf8'),
  ]);

  for (const [path, html] of [
    ['about', about],
    ['contact', contact],
    ['faq', faq],
  ]) {
    assert.match(html, /site-hero fdn-hero/, path);
    assert.match(html, /h1 class="fdn-display"/, path);
    assert.match(html, /site-lead fdn-lead/, path);
    assert.doesNotMatch(html, /text-4xl|font-black|sm:text-5xl/, path);
  }

  assert.match(about, /site-content fdn-card-grid/);
  assert.match(contact, /site-content fdn-card-grid/);
  assert.equal((faq.match(/<details class="fdn-disclosure"/g) ?? []).length, 6);
  assert.match(faq, /<details class="fdn-disclosure" open>/);
  assert.match(css, /\.fdn-card-grid/);
  assert.match(css, /\.fdn-disclosure/);
  assert.match(css, /\.marketing-shell \.site-main,[\s\S]*max-width: 48rem/);
  assert.match(css, /\.site-panel\.fdn-card[\s\S]*box-shadow: none/);
  assert.match(css, /\.fdn-disclosure summary[\s\S]*font-size: 1rem/);
  assert.match(css, /site-eyebrow[^}]*site-theme-chooser__eyebrow\)[\s\S]*background: transparent/);
});
test('landing recipe normalizes legacy surfaces through Foundations roles', async () => {
  const [landing, primitives] = await Promise.all([
    readFile(new URL('../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../assets/css/foundations-primitives.css', import.meta.url), 'utf8'),
  ]);
  assert.match(landing, /class="mono-page mono-landing-page"/);
  assert.match(landing, /class="mono-hero/);
  assert.match(primitives, /body\.mono-landing-page \{[\s\S]*--mono-paper: var\(--fdn-background\)/);
  assert.match(primitives, /body\.mono-landing-page \.mono-section \{[\s\S]*var\(--fdn-space-8\)/);
  assert.match(primitives, /body\.mono-landing-page h1 \{[\s\S]*max-width: 24ch/);
  assert.match(primitives, /body\.mono-landing-page :is\([\s\S]*\.mono-phone[\s\S]*background: var\(--fdn-card\)/);
});
test('every visible non-card route shell opts into the Foundations adapter', async () => {
  const shells = await collectVisibleRouteShells();
  assert.ok(shells.length >= 51, `expected visible route shells, received ${shells.length}`);

  for (const { path, html } of shells) {
    assert.match(html, /foundations-tokens\.css/, path);
    assert.match(html, /foundations-typography\.css/, path);
    assert.match(html, /foundations-primitives\.css/, path);
    assert.match(html, /ui-foundations/, path);
    assert.ok(
      /<html[^>]*class="[^"]*ui-foundations/.test(html)
      || /document\.documentElement\.classList\.add\("ui-foundations"/.test(html),
      path + ': theme scope must live on html so rem and palette aliases match',
    );
  }
});

test('shared actions and chooser use real selectors and semantic roles', () => {
  for (const selector of ['.fdn-button--primary', '.fdn-button--secondary', '.app-shell__logout', '.site-theme-chooser__choice']) {
    assert.ok(css.includes(selector), selector);
  }
  assert.doesNotMatch(css, /\.theme-choice__/);
  assert.match(css, /--site-ink: var\(--fdn-foreground\)/);
  assert.match(css, /--site-line: var\(--fdn-border\)/);
  assert.match(css, /html\.ui-foundations\[data-site-theme\]/);
});
test('workspace panels and admin navigation have reusable presentation roles', async () => {
  for (const route of ['account', 'card/catalog', 'card/settings', 'card/social']) {
    const html = await readFile(new URL('../app/' + route + '/index.html', import.meta.url), 'utf8');
    assert.match(html, /class="fdn-panel /, route);
  }
  const admin = await readFile(new URL('../pages/admin/super-admin-workspace.js', import.meta.url), 'utf8');
  const email = await readFile(new URL('../pages/admin/email-templates.js', import.meta.url), 'utf8');
  assert.match(admin, /dashboard-action fdn-nav-link/);
  assert.match(admin, /aria-current/);
  assert.match(email, /fdn-panel/);
  assert.match(css, /\.fdn-nav-link:is\(:hover, \[aria-current="page"\]\)/);
});

function token(source, name) {
  const match = source.match(new RegExp('--fdn-' + name + ':\\s*(#[0-9a-f]{6})', 'i'));
  assert.ok(match, 'missing token: ' + name);
  return match[1];
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((part) => {
    const value = Number.parseInt(part, 16) / 255;
    return value <= 0.03928
      ? value / 12.92
      : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2]);
}

function contrast(left, right) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('light and dark pilot tokens keep readable text contrast', async () => {
  const tokenCss = await readFile(
    new URL('../assets/css/foundations-tokens.css', import.meta.url),
    'utf8',
  );
  const darkStart = tokenCss.indexOf('html[data-site-theme="dark"]');
  const light = tokenCss.slice(0, darkStart);
  const dark = tokenCss.slice(darkStart);

  for (const source of [light, dark]) {
    assert.ok(contrast(token(source, 'foreground'), token(source, 'background')) >= 4.5);
    assert.ok(contrast(token(source, 'card-foreground'), token(source, 'card')) >= 4.5);
    assert.ok(contrast(token(source, 'primary-foreground'), token(source, 'primary')) >= 4.5);
  }
});
