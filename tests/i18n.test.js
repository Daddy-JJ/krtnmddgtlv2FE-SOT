import assert from 'node:assert/strict';
import test from 'node:test';
import { appConfig } from '../config/app-config.js';
import { I18n } from '../services/i18n.js';

test('i18n falls back to Indonesian and resolves nested keys', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let requestedUrl;
  globalThis.fetch = async url => {
    requestedUrl = url;
    return new Response(JSON.stringify({ nav: { login: 'Masuk' } }), { status: 200 });
  };

  const i18n = await new I18n().load('unsupported');
  assert.equal(requestedUrl, '/locales/id.json');
  assert.equal(i18n.t('nav.login'), 'Masuk');
  assert.equal(i18n.t('unknown.key', 'Fallback'), 'Fallback');
});

test('English remains dormant and runtime translation stays Indonesian-only', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let requestedUrl;
  globalThis.fetch = async url => {
    requestedUrl = url;
    return new Response(JSON.stringify({ label: 'Teks aman' }), { status: 200 });
  };
  const i18n = await new I18n().load('en');
  const element = { dataset: { i18n: 'label' }, textContent: 'Old' };
  i18n.apply({ querySelectorAll: () => [element] });
  assert.deepEqual(appConfig.supportedLocales, ['id']);
  assert.equal(i18n.locale, 'id');
  assert.equal(requestedUrl, '/locales/id.json');
  assert.equal(element.textContent, 'Teks aman');
});
