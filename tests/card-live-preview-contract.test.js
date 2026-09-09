import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('card editor renders unsaved form data through the allowlisted active theme template', async () => {
  const [component, controller, html, styles] = await Promise.all([
    readFile(new URL('../components/card-live-preview.js', import.meta.url), 'utf8'),
    readFile(new URL('../pages/app/card-editor.js', import.meta.url), 'utf8'),
    readFile(new URL('../app/card/identity/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../assets/css/app.css', import.meta.url), 'utf8'),
  ]);

  assert.match(component, /fetch\('\/config\/theme-registry\.json'/);
  assert.match(component, /fetch\('\/assets\/css\/card-themes\.css'/);
  assert.match(component, /\^\\\/components\\\/card-themes\\\//);
  assert.match(component, /root\.querySelector\('script, iframe, object, embed'\)/);
  assert.match(component, /attachShadow\(\{ mode: 'closed' \}\)/);
  assert.match(component, /renderCardTheme\(root, initialCard\)/);
  assert.match(component, /export function mountCardThemePreview/);
  assert.match(component, /update\(card\)/);
  assert.match(controller, /form\?\.addEventListener\('input', updateLivePreview\)/);
  assert.match(controller, /state\.preview\?\.update\(previewData\(\)\)/);
  assert.match(controller, /Object\.fromEntries\(editableFields\.map/);
  assert.match(controller, /logoUrl: state\.card\?\.logoUrl/);
  assert.match(html, /data-card-live-preview/);
  assert.match(html, /name="mapsUrl"/);
  assert.match(html, /data-whatsapp-preview/);
  assert.match(controller, /Tombol WhatsApp publik akan memakai nomor mobile/);
  assert.doesNotMatch(controller, /CTA WhatsApp tersedia pada paket Pro/);
  assert.match(styles, /\.card-editor-preview/);
  assert.match(styles, /\.card-theme-preview__host/);
});
