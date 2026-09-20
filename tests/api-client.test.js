import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiClient } from '../services/api-client.js';
import { ApiError } from '../services/api-error.js';

const jsonResponse = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', ...headers },
});

test('unsafe JSON request includes cookies, request ID, and access CSRF', async () => {
  let observed;
  const client = new ApiClient({
    baseUrl: 'https://api.example.test/api/v1/',
    cookieSource: () => 'csrf_token=access-csrf; starter_csrf_token=starter-csrf',
    fetchImpl: async (url, options) => {
      observed = { url, options };
      return jsonResponse({ success: true, data: { saved: true } });
    },
  });

  assert.deepEqual(await client.post('/cards', { name: 'Ayu' }), { saved: true });
  assert.equal(observed.url, 'https://api.example.test/api/v1/cards');
  assert.equal(observed.options.credentials, 'include');
  assert.equal(observed.options.headers.get('x-csrf-token'), 'access-csrf');
  assert.ok(observed.options.headers.get('x-request-id'));
  assert.equal(observed.options.headers.get('content-type'), 'application/json');
  assert.equal(observed.options.body, JSON.stringify({ name: 'Ayu' }));
});

test('Starter mutations explicitly use the Starter CSRF context', async () => {
  let csrfHeader;
  const client = new ApiClient({
    cookieSource: () => 'csrf_token=access-csrf; starter_csrf_token=starter-csrf',
    fetchImpl: async (_url, options) => {
      csrfHeader = options.headers.get('x-csrf-token');
      return jsonResponse({ success: true, data: null });
    },
  });

  await client.patch('/starter/cards/demo', { locale: 'id' }, { csrfContext: 'starter' });
  assert.equal(csrfHeader, 'starter-csrf');
});

test('access mutation bootstraps CSRF in memory when the cross-subdomain cookie is unreadable', async () => {
  const observed = [];
  const client = new ApiClient({
    baseUrl: 'https://api.example.test/api/v1',
    cookieSource: () => '',
    fetchImpl: async (url, options) => {
      observed.push({ path: new URL(url).pathname, method: options.method, csrf: options.headers.get('x-csrf-token') });
      if (url.endsWith('/auth/csrf')) return jsonResponse({ success: true, data: { csrfToken: 'bootstrapped-csrf' } });
      return jsonResponse({ success: true, data: null });
    },
  });

  await client.post('/auth/logout', null, { csrfContext: 'access', skipRefresh: true });
  assert.deepEqual(observed, [
    { path: '/api/v1/auth/csrf', method: 'GET', csrf: null },
    { path: '/api/v1/auth/logout', method: 'POST', csrf: 'bootstrapped-csrf' },
  ]);
});

test('401 triggers one controlled refresh and one request retry', async () => {
  const paths = [];
  let cardAttempts = 0;
  const client = new ApiClient({
    cookieSource: () => 'csrf_token=access-csrf',
    fetchImpl: async (url) => {
      const path = new URL(url, 'https://local.test').pathname;
      paths.push(path);
      if (path.endsWith('/auth/refresh')) return jsonResponse({ success: true, data: { user: {} } });
      cardAttempts += 1;
      return cardAttempts === 1
        ? jsonResponse({ success: false, code: 'AUTH_REQUIRED', message: 'Expired.' }, 401)
        : jsonResponse({ success: true, data: { id: 'card-1' } });
    },
  });

  assert.deepEqual(await client.get('/cards/card-1'), { id: 'card-1' });
  assert.deepEqual(paths, ['/api/v1/cards/card-1', '/api/v1/auth/refresh', '/api/v1/cards/card-1']);
});

test('second 401 is returned without a refresh loop', async () => {
  let calls = 0;
  const client = new ApiClient({
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ success: false, code: 'AUTH_REQUIRED', message: 'Expired.' }, 401);
    },
  });

  await assert.rejects(client.get('/cards'), error => error instanceof ApiError && error.status === 401);
  assert.equal(calls, 2);
});

test('backend error envelope is normalized with request ID and validation details', async () => {
  const client = new ApiClient({
    fetchImpl: async () => jsonResponse({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed.',
      errors: [{ field: 'name', message: 'Required.' }],
      request_id: 'req-server',
    }, 422),
  });

  await assert.rejects(client.post('/cards', {}), error => {
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.requestId, 'req-server');
    assert.deepEqual(error.details, [{ field: 'name', message: 'Required.' }]);
    return true;
  });
});

test('deployment proxy errors retain their actionable code and message', async () => {
  const client = new ApiClient({
    fetchImpl: async () => jsonResponse({
      success: false,
      code: 'BACKEND_NOT_CONFIGURED',
      message: 'Backend API production origin is not configured.',
    }, 503),
  });

  await assert.rejects(client.post('/starter/cards', {}), error => {
    assert.equal(error.code, 'BACKEND_NOT_CONFIGURED');
    assert.equal(error.message, 'Backend API production origin is not configured.');
    return true;
  });
});

test('legacy nested deployment proxy errors retain their actionable message', async () => {
  const client = new ApiClient({
    fetchImpl: async () => jsonResponse({
      error: {
        code: 'BACKEND_UNAVAILABLE',
        message: 'Backend API is temporarily unavailable.',
      },
    }, 502),
  });

  await assert.rejects(client.post('/starter/cards', {}), error => {
    assert.equal(error.code, 'BACKEND_UNAVAILABLE');
    assert.equal(error.message, 'Backend API is temporarily unavailable.');
    return true;
  });
});

test('network failures use a safe consistent error', async () => {
  const client = new ApiClient({ fetchImpl: async () => { throw new Error('private network detail'); } });
  await assert.rejects(client.get('/cards'), error => (
    error instanceof ApiError
    && error.code === 'NETWORK_ERROR'
    && error.message === 'Network request failed.'
  ));
});

test('browser fetch is invoked with the global receiver', async () => {
  let receiver;
  const client = new ApiClient({
    fetchImpl: function () {
      receiver = this;
      return Promise.resolve(jsonResponse({ success: true, data: { healthy: true } }));
    },
  });

  assert.deepEqual(await client.get('/health'), { healthy: true });
  assert.equal(receiver, globalThis);
});

test('null payload is omitted for strict no-body POST endpoints', async () => {
  let observed;
  const client = new ApiClient({
    cookieSource: () => 'csrf_token=access-csrf',
    fetchImpl: async (_url, options) => {
      observed = options;
      return jsonResponse({ success: true, data: null });
    },
  });

  await client.post('/auth/logout', null, { csrfContext: 'access', skipRefresh: true });
  assert.equal(observed.body, null);
  assert.equal(observed.headers.has('content-type'), false);
  assert.equal(observed.headers.get('x-csrf-token'), 'access-csrf');
});

test('callers can opt into the complete success envelope for pagination metadata', async () => {
  const envelope = {
    success: true,
    data: [{ publicId: 'feedback-public-id' }],
    meta: { page: 2, limit: 25, total: 30, pages: 2 },
  };
  const client = new ApiClient({ fetchImpl: async () => jsonResponse(envelope) });

  assert.deepEqual(await client.get('/admin/feedback?page=2', { includeEnvelope: true }), envelope);
  assert.deepEqual(await client.get('/admin/feedback?page=2'), envelope.data);
});
