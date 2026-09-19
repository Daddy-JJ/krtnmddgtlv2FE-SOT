import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import proxy from '../api/v1/[...path].js';

const proxySource = await readFile(new URL('../api/v1/[...path].js', import.meta.url), 'utf8');
const starterServiceSource = await readFile(new URL('../services/starter-service.js', import.meta.url), 'utf8');

function numericConstant(source, name) {
  const match = source.match(new RegExp(`const ${name} = (\\d[\\d_]*)`));
  assert.ok(match, `${name} must be declared as a numeric constant`);
  return Number(match[1].replaceAll('_', ''));
}

async function withEnvironment(value, callback) {
  const previous = process.env.BACKEND_API_BASE_URL;
  if (value === undefined) delete process.env.BACKEND_API_BASE_URL;
  else process.env.BACKEND_API_BASE_URL = value;
  try {
    await callback();
  } finally {
    if (previous === undefined) delete process.env.BACKEND_API_BASE_URL;
    else process.env.BACKEND_API_BASE_URL = previous;
  }
}

test('Vercel API proxy fails closed without a stable HTTPS backend', { concurrency: false }, async () => {
  for (const value of [
    undefined,
    'http://api.example.com',
    'https://127.0.0.1:3000',
    'https://temporary.trycloudflare.com',
    'https://api.example.com/api',
  ]) {
    await withEnvironment(value, async () => {
      const response = await proxy.fetch(new Request('https://frontend.example/api/v1/health'));
      assert.equal(response.status, 503, String(value));
      assert.deepEqual(await response.json(), {
        success: false,
        code: 'BACKEND_NOT_CONFIGURED',
        message: 'Backend API production origin is not configured.',
      });
    });
  }
});

test('Vercel API proxy forwards to the configured origin', { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  await withEnvironment('https://api.example.com', async () => {
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), 'https://api.example.com/api/v1/health?probe=1');
      assert.equal(options.method, 'GET');
      assert.equal(options.headers.get('x-test'), 'safe');
      return Response.json({ status: 'ok' }, { status: 200 });
    };
    try {
      const response = await proxy.fetch(new Request(
        'https://frontend.example/api/v1/health?probe=1',
        { headers: { 'x-test': 'safe' } },
      ));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: 'ok' });
      assert.equal(response.headers.get('cache-control'), 'no-store');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test('Vercel proxy timeout is not shorter than the Starter create timeout', () => {
  const proxyTimeoutMs = numericConstant(proxySource, 'PROXY_UPSTREAM_TIMEOUT_MS');
  const starterCreateTimeoutMs = numericConstant(starterServiceSource, 'STARTER_CREATE_TIMEOUT_MS');
  assert.ok(proxyTimeoutMs >= starterCreateTimeoutMs);
  assert.match(proxySource, /AbortSignal\.timeout\(PROXY_UPSTREAM_TIMEOUT_MS\)/);
});
