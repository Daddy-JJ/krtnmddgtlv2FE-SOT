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
      return Promise.resolve(jsonResponse({ success: true, data: { status: 'healthy' } }));
    },
  });

  assert.deepEqual(await client.get('/health'), { status: 'healthy' });
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

test('logout can explicitly synchronize access CSRF before a mutation', async () => {
  const observed = [];
  const client = new ApiClient({
    baseUrl: 'https://api.example.test/api/v1',
    cookieSource: () => 'csrf_token=stale-csrf',
    fetchImpl: async (url, options) => {
      const path = new URL(url).pathname;
      observed.push({ path, csrf: options.headers.get('x-csrf-token') });
      if (path.endsWith('/auth/csrf')) {
        return jsonResponse({ success: true, data: { csrfToken: 'fresh-csrf' } });
      }
      return jsonResponse({ success: true, data: null });
    },
  });

  await client.synchronizeAccessCsrf();
  await client.post('/auth/logout', null, {
    csrfContext: 'access',
    forceAccessCsrf: true,
    skipRefresh: true,
  });
  assert.deepEqual(observed, [
    { path: '/api/v1/auth/csrf', csrf: null },
    { path: '/api/v1/auth/logout', csrf: 'fresh-csrf' },
  ]);
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

test('a rejected access CSRF token is replaced and the mutation is retried exactly once', async () => {
  const observed = [];
  const client = new ApiClient({
    baseUrl: 'https://api.example.test/api/v1',
    cookieSource: () => 'csrf_token=stale-csrf',
    fetchImpl: async (url, options) => {
      const path = new URL(url).pathname;
      const csrf = options.headers.get('x-csrf-token');
      observed.push({ path, csrf });
      if (path.endsWith('/auth/csrf')) {
        return jsonResponse({ success: true, data: { csrfToken: 'fresh-csrf' } });
      }
      if (csrf === 'stale-csrf') {
        return jsonResponse({ success: false, code: 'CSRF_INVALID', message: 'Rejected.' }, 403);
      }
      return jsonResponse({ success: true, data: { saved: true } });
    },
  });

  assert.deepEqual(await client.put('/cards/card-1', { name: 'Ayu' }), { saved: true });
  assert.deepEqual(observed, [
    { path: '/api/v1/cards/card-1', csrf: 'stale-csrf' },
    { path: '/api/v1/auth/csrf', csrf: null },
    { path: '/api/v1/cards/card-1', csrf: 'fresh-csrf' },
  ]);
});

test('CSRF recovery does not create an unbounded retry loop', async () => {
  let calls = 0;
  const client = new ApiClient({
    baseUrl: 'https://api.example.test/api/v1',
    cookieSource: () => 'csrf_token=stale-csrf',
    fetchImpl: async (url) => {
      calls += 1;
      if (url.endsWith('/auth/csrf')) {
        return jsonResponse({ success: true, data: { csrfToken: 'fresh-csrf' } });
      }
      return jsonResponse({ success: false, code: 'CSRF_INVALID', message: 'Rejected.' }, 403);
    },
  });

  await assert.rejects(client.patch('/cards/card-1', {}), error => (
    error instanceof ApiError && error.code === 'CSRF_INVALID'
  ));
  assert.equal(calls, 3);
});

test('AUTH_REQUIRED never refreshes or replays an unsafe mutation', async () => {
  const paths = [];
  const client = new ApiClient({
    baseUrl: 'https://api.example.test/api/v1',
    cookieSource: () => 'csrf_token=initial-csrf',
    fetchImpl: async (url) => {
      const path = new URL(url).pathname;
      paths.push(path);
      return jsonResponse({ success: false, code: 'AUTH_REQUIRED', message: 'Expired.' }, 401);
    },
  });

  await assert.rejects(client.post('/payments/payment-1/reconcile', null), error => (
    error instanceof ApiError && error.code === 'AUTH_REQUIRED'
  ));
  assert.deepEqual(paths, ['/api/v1/payments/payment-1/reconcile']);
});

test('INVALID_CREDENTIALS is not treated as an expired session', async () => {
  let calls = 0;
  const client = new ApiClient({
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ success: false, code: 'INVALID_CREDENTIALS', message: 'Wrong password.' }, 401);
    },
  });

  await assert.rejects(client.get('/me'), error => (
    error instanceof ApiError && error.code === 'INVALID_CREDENTIALS'
  ));
  assert.equal(calls, 1);
});

test('CSRF_INVALID does not replay a non-idempotent POST', async () => {
  let calls = 0;
  const client = new ApiClient({
    cookieSource: () => 'csrf_token=stale-csrf',
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ success: false, code: 'CSRF_INVALID', message: 'Rejected.' }, 403);
    },
  });

  await assert.rejects(client.post('/feedback', { message: 'A valid feedback message.' }), error => (
    error instanceof ApiError && error.code === 'CSRF_INVALID'
  ));
  assert.equal(calls, 1);
});

test('request timeout remains active when a caller also supplies an abort signal', async () => {
  const external = new AbortController();
  const client = new ApiClient({
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }),
  });

  await assert.rejects(client.get('/slow', { signal: external.signal }), error => (
    error instanceof ApiError && error.code === 'REQUEST_TIMEOUT'
  ));
  assert.equal(external.signal.aborted, false);
});
