import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

test('card editor fails closed when its initial card read fails', async () => {
  const editor = await source('pages/app/card-editor.js');
  assert.match(editor, /mode: 'loading'/);
  assert.match(editor, /state\.mode = 'load_failed'/);
  assert.match(editor, /setEditorLocked\(state\.mode === 'load_failed'\)/);
  assert.match(editor, /if \(!\['empty', 'ready'\]\.includes\(state\.mode\)\)/);
});

test('password reset token is consumed from memory and removed from visible browser state', async () => {
  const reset = await source('pages/auth/reset-password.js');
  assert.match(reset, /elements\.token\?\.closest\('div'\)\?\.remove\(\)/);
  assert.match(reset, /url\.hash\.startsWith\('#'\)/);
  assert.match(reset, /fragment\.get\('token'\)/);
  assert.match(reset, /legacyQueryToken/);
  assert.match(reset, /url\.searchParams\.delete\('token'\)/);
  assert.match(reset, /fragment\.delete\('token'\)/);
  assert.match(reset, /history\.replaceState\(history\.state, '', `\$\{url\.pathname\}\$\{url\.search\}\$\{url\.hash\}`\)/);
  assert.match(reset, /\{ \.\.\.formValues\(form\), token \}/);
  assert.doesNotMatch(reset, /localStorage|sessionStorage|console\./);
});

test('sensitive admin payloads use per-view allowlists and safe failure copy', async () => {
  const workspace = await source('pages/admin/super-admin-workspace.js');
  assert.match(workspace, /adminFieldAllowlists/);
  assert.match(workspace, /api\.\?key/);
  assert.match(workspace, /file\.\*path/);
  assert.doesNotMatch(workspace, /item\.lastErrorMessage/);
  assert.match(workspace, /apiErrorMessage\(error, 'Permintaan admin tidak dapat diproses\.'\)/);
  assert.match(workspace, /return await renderCards\(/);
  assert.match(workspace, /return await renderEmailTemplateManager\(/);
  assert.match(workspace, /rowsPanel\('Audit kartu',data\.audit\?\?\[\],'audit'\)/);
});

test('high-impact form actions prevent duplicate submission', async () => {
  const [revision, templates] = await Promise.all([
    source('pages/app/resume-enhancement-revision.js'),
    source('pages/admin/email-templates.js'),
  ]);
  assert.match(revision, /if \(submitting\) return/);
  assert.match(revision, /submit\.disabled = true/);
  assert.match(revision, /setAttribute\('aria-busy', 'true'\)/);
  assert.match(templates, /if \(button\.disabled\) return/);
  assert.match(templates, /button\.setAttribute\('aria-busy', 'true'\)/);
  assert.match(templates, /finally/);
});

test('app navigation protects dirty forms and restores keyboard focus after navigation', async () => {
  const shell = await source('components/app-shell.js');
  assert.match(shell, /hasUnsavedChanges/);
  assert.match(shell, /beforeunload/);
  assert.match(shell, /confirmDiscardChanges/);
  assert.match(shell, /window\.confirm/);
  assert.match(shell, /nextMain\.tabIndex = -1/);
  assert.match(shell, /nextMain\.focus\(/);
});

test('public card links and audit visuals fail closed', async () => {
  const [dashboard, styles] = await Promise.all([
    source('pages/app/dashboard.js'),
    source('assets/css/foundations-primitives.css'),
  ]);
  assert.match(dashboard, /safeHttpUrl/);
  assert.match(dashboard, /url\.origin === location\.origin/);
  assert.match(styles, /--fdn-danger/);
  assert.doesNotMatch(styles, /--fdn-destructive/);
  assert.match(styles, /\.admin-navigation__label[\s\S]*font-size: \.75rem !important[\s\S]*font-weight: 800 !important/);
  assert.match(styles, /:is\(\.admin-filter-form, \.admin-report-period[\s\S]*label[\s\S]*min-width: 0/);
});
