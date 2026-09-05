import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../config/runtime-config.js', import.meta.url), 'utf8');

function runtimeConfig(existingConfig, hostname, injected = {}) {
  const context = {};
  if (existingConfig) context.__KND_CONFIG__ = existingConfig;
  if (hostname) context.location = { hostname };
  const evaluatedSource = source
    .replace(
      "const injectedApiBaseUrl = '__PUBLIC_API_BASE_URL__';",
      `const injectedApiBaseUrl = ${JSON.stringify(injected.apiBaseUrl ?? '__PUBLIC_API_BASE_URL__')};`,
    )
    .replace(
      "const injectedTimeout = '__PUBLIC_API_TIMEOUT_MS__';",
      `const injectedTimeout = ${JSON.stringify(injected.timeout ?? '__PUBLIC_API_TIMEOUT_MS__')};`,
    );
  runInNewContext(evaluatedSource, context);
  return context.__KND_CONFIG__;
}

test('undeployed placeholders safely use the same-origin API route', () => {
  const config = runtimeConfig();
  assert.equal(config.apiBaseUrl, '/api/v1');
  assert.equal(config.requestTimeoutMs, 12_000);
  assert.equal(Object.isFrozen(config), true);
});

test('127.0.0.1 frontend uses the local backend API port', () => {
  const config = runtimeConfig(undefined, '127.0.0.1');
  assert.equal(config.apiBaseUrl, 'http://127.0.0.1:3000/api/v1');
  assert.equal(config.requestTimeoutMs, 12_000);
});

test('localhost uses the 127.0.0.1 backend hostname for cookie consistency', () => {
  const config = runtimeConfig(undefined, 'localhost');
  assert.equal(config.apiBaseUrl, 'http://127.0.0.1:3000/api/v1');
  assert.equal(config.requestTimeoutMs, 12_000);
});

test('non-local hosts retain the same-origin API route', () => {
  const config = runtimeConfig(undefined, 'preview.example.test');
  assert.equal(config.apiBaseUrl, '/api/v1');
  assert.equal(config.requestTimeoutMs, 12_000);
});

test('injected public API base remains authoritative on a local host', () => {
  const config = runtimeConfig(undefined, '127.0.0.1', {
    apiBaseUrl: 'https://api.example.test/api/v1',
    timeout: '9000',
  });
  assert.equal(config.apiBaseUrl, 'https://api.example.test/api/v1');
  assert.equal(config.requestTimeoutMs, 9_000);
});

test('a server-owned runtime override remains authoritative', () => {
  const config = runtimeConfig({ apiBaseUrl: '/controlled-api', requestTimeoutMs: 3456 }, '127.0.0.1');
  assert.equal(config.apiBaseUrl, '/controlled-api');
  assert.equal(config.requestTimeoutMs, 3456);
});
