import assert from 'node:assert/strict';
import test from 'node:test';
import { safeHttpUrl, safeImageUrl, safeMailtoHref, safeTelHref } from '../utils/safe-url.js';

test('safeHttpUrl permits only complete HTTP(S) URLs', () => {
  assert.equal(safeHttpUrl('https://example.com/a?b=1'), 'https://example.com/a?b=1');
  assert.equal(safeHttpUrl('http://example.com'), 'http://example.com/');
  for (const unsafe of [
    '',
    '   ',
    '/relative/path',
    'javascript:alert(1)',
    'data:text/html,test',
    'file:///tmp/test',
    '//example.com',
    'https://user:password@example.com',
    'https://exam ple.com',
    'https://example.com/\nscript',
  ]) {
    assert.equal(safeHttpUrl(unsafe), '', unsafe);
  }
});

test('safeImageUrl permits HTTP(S) and safe image data URIs only', () => {
  assert.equal(safeImageUrl('https://example.com/logo.png'), 'https://example.com/logo.png');
  assert.equal(
    safeImageUrl('data:image/png;base64,AAAA'),
    'data:image/png;base64,AAAA',
  );
  assert.equal(
    safeImageUrl('data:image/svg+xml;charset=UTF-8,%3Csvg%3E'),
    'data:image/svg+xml;charset=UTF-8,%3Csvg%3E',
  );
  for (const unsafe of [
    '',
    '   ',
    '/relative/logo.png',
    'javascript:alert(1)',
    'data:text/html,test',
    'data:image/svg+xml,<script>alert(1)</script>',
    'file:///tmp/logo.png',
    'https://user:password@example.com/logo.png',
  ]) {
    assert.equal(safeImageUrl(unsafe), '', unsafe);
  }
});

test('safeMailtoHref validates the address before creating a link', () => {
  assert.equal(safeMailtoHref(' User@Example.com '), 'mailto:user@example.com');
  assert.equal(safeMailtoHref('user@example.com?subject=unsafe'), '');
  assert.equal(safeMailtoHref('javascript:alert(1)'), '');
});

test('safeTelHref accepts phone punctuation but rejects protocol injection', () => {
  assert.equal(safeTelHref('+62 812-3456 (7890)'), 'tel:+62812-3456(7890)');
  assert.equal(safeTelHref('123;phone-context=evil.example'), '');
  assert.equal(safeTelHref('javascript:alert(1)'), '');
  assert.equal(safeTelHref('---'), '');
});
