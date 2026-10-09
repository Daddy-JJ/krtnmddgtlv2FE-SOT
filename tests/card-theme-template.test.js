import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const frontendUrl = new URL('../', import.meta.url);
const registry = JSON.parse(await readFile(new URL('config/theme-registry.json', frontendUrl), 'utf8'));
const requiredFields = [
  'fullName',
  'jobTitle',
  'organization',
  'officePhone',
  'mobilePhone',
  'email',
  'websiteUrl',
  'addressText',
  'qrUrl',
];

test('Bayu keeps its light contact footer with explicit dark link states and legible typography', async () => {
  const styles = await readFile(new URL('assets/css/card-themes.css', frontendUrl), 'utf8');
  assert.match(styles, /\.theme-basic-blue-line \.digital-card__contacts\s*\{[^}]*background: #f5f3ee/);
  assert.match(styles, /\.theme-basic-blue-line \.digital-card__contact\s*\{[^}]*font-size: clamp\(\.8rem, 1\.45cqw, \.95rem\);[^}]*font-weight: 550/);
  assert.match(styles, /\.theme-basic-blue-line \.digital-card__contact a:focus-visible\s*\{\s*color: #15191f/);
  assert.match(styles, /\.theme-basic-blue-line \.digital-card__contact a:visited/);
});

test('locked theme catalog keeps 10 templates with 7 landscape and 3 portrait', () => {
  assert.equal(registry.themes.length, 10);
  assert.equal(registry.themes.filter(({ orientation }) => orientation === 'landscape').length, 7);
  assert.equal(registry.themes.filter(({ orientation }) => orientation === 'portrait').length, 3);
  assert.deepEqual(registry.themes.map(({ displayOrder }) => displayOrder), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(
    registry.themes.map(({ name }) => name),
    ['Aksara', 'Bayu', 'Baskara', 'Nilam', 'Prasasti', 'Padma', 'Kanaka', 'Naya', 'Kirana', 'Mahardika'],
  );
  assert.deepEqual(
    registry.themes.map(({ minimumPlan }) => minimumPlan),
    ['starter', 'basic', 'basic', 'pro', 'pro', 'pro', 'pro', 'pro', 'pro', 'pro'],
  );
});

test('templates share the normalized responsive contract without visible tier tags', async () => {
  for (const theme of registry.themes) {
    const source = await readFile(new URL(theme.template.replace(/^\//, ''), frontendUrl), 'utf8');

    assert.match(source, new RegExp(`data-theme-code="${theme.code}"`));
    assert.match(source, new RegExp(`data-orientation="${theme.orientation}"`));
    assert.doesNotMatch(source, />\s*(starter|basic|pro)\s*</i);
    assert.match(source, /data-list="socialLinks"/);
    assert.match(source, /data-contact-row/);

    for (const field of requiredFields) {
      assert.match(source, new RegExp(`data-field="${field}"`), `${theme.code} must render ${field}`);
    }

    if (theme.minimumPlan === 'pro') {
      assert.match(source, /data-field="logoUrl"/);
      assert.match(source, /data-logo-slot/);
    } else {
      assert.doesNotMatch(source, /data-field="logoUrl"/);
      assert.doesNotMatch(source, /data-logo-slot/);
    }
  }
});

test('theme CSS defines wrapping, two-line clamping, adaptive typography, and mobile layout', async () => {
  const source = await readFile(new URL('assets/css/card-themes.css', frontendUrl), 'utf8');

  assert.match(source, /overflow-wrap:\s*anywhere/);
  assert.match(source, /-webkit-line-clamp:\s*2/);
  assert.match(source, /\.digital-card--name-very-long/);
  assert.match(source, /\.digital-card--contacts-dense/);
  assert.match(source, /\.digital-card--compact/);
  assert.match(source, /\.digital-card__contacts--portrait/);
  assert.match(source, /\.digital-card__socials--portrait/);
  assert.match(source, /@media\s*\(max-width:\s*620px\)/);
  assert.match(source, /Keep serif descenders/);
  assert.match(source, /\.theme-starter-clean \.digital-card__name[\s\S]*line-height:\s*1\.08/);
});

test('approved Basic F and Pro B replacements keep their stable codes and distinct composition hooks', async () => {
  const basic = await readFile(new URL('components/card-themes/basic-blue-line.html', frontendUrl), 'utf8');
  const pro = await readFile(new URL('components/card-themes/pro-navy-gold-split.html', frontendUrl), 'utf8');
  const renderer = await readFile(new URL('services/card-theme-renderer.js', frontendUrl), 'utf8');

  assert.match(basic, /data-theme-code="basic-blue-line"/);
  assert.match(basic, /data-name-lead/);
  assert.match(basic, /data-name-tail/);
  assert.match(basic, /digital-card__ornament--kinetic/);
  assert.doesNotMatch(basic, /data-logo-slot|data-field="logoUrl"/);

  assert.match(pro, /data-theme-code="pro-navy-gold-split"/);
  assert.match(pro, /digital-card__ornament--editorial/);
  assert.match(pro, /data-field="canonicalUrl"/);
  assert.match(pro, /data-logo-slot/);

  assert.match(renderer, /function setSplitName/);
  assert.match(renderer, /setText\(root,\s*"canonicalUrl"/);
  assert.match(renderer, /safeHttpUrl\(card\.websiteUrl\)/);
  assert.match(renderer, /safeMailtoHref\(card\.email\)/);
  assert.match(renderer, /safeTelHref\(card\.mobilePhone\)/);
  assert.doesNotMatch(renderer, /link\.href\s*=\s*item\.url/);
});

test('approved Pro portrait themes keep logo-led hierarchy with visible field parity', async () => {
  const portraitCodes = [
    'pro-vertical-black-gold',
    'pro-vertical-light-panel',
    'pro-vertical-modern-dark',
  ];
  const visibleContactFields = ['officePhone', 'mobilePhone', 'email', 'websiteUrl', 'addressText'];

  for (const code of portraitCodes) {
    const theme = registry.themes.find((candidate) => candidate.code === code);
    const source = await readFile(new URL(theme.template.replace(/^\//, ''), frontendUrl), 'utf8');
    const contactList = source.match(/<ul class="digital-card__contacts digital-card__contacts--portrait"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? '';

    assert.match(source, /data-logo-slot/);
    assert.match(source, /digital-card__org--badge/);
    assert.match(source, /digital-card__socials digital-card__socials--portrait/);
    assert.doesNotMatch(source, /digital-card__sr-only/);
    for (const field of visibleContactFields) {
      assert.match(contactList, new RegExp(`data-field="${field}"`), `${code} must visibly render ${field}`);
    }
    assert.doesNotMatch(source, />\s*(starter|basic|pro)\s*</i);
  }
});

test('every registry preview is a non-empty PNG with the locked orientation dimensions', async () => {
  for (const theme of registry.themes) {
    const preview = await readFile(new URL(theme.previewImage.replace(/^\//, ''), frontendUrl));
    assert.ok(preview.length > 10_000, `${theme.code} preview must not be an empty placeholder`);
    assert.deepEqual([...preview.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    const width = preview.readUInt32BE(16);
    const height = preview.readUInt32BE(20);
    const expected = theme.orientation === 'portrait' ? [1000, 1573] : [1573, 1000];
    assert.deepEqual([width, height], expected, `${theme.code} preview dimensions must match its orientation`);
  }
});
