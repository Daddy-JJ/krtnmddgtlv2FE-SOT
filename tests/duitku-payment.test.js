import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, readdir } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { ApiClient, api } from '../services/api-client.js';
import { createPaymentService, paymentService } from '../services/payment-service.js';
import { createPaymentFlow } from '../services/payment-flow.js';
import { createIntentStore, createBrowserIntentStore, PAYMENT_INTENT_KEY } from '../utils/payment-intent.js';
import { PAYMENT_CHECKOUT_RELEASED, PAYMENT_SANDBOX_RELEASED, paymentCheckoutAllowed, paymentRedirectUrl, paymentErrorMessage, validCapabilities, pendingPaymentIssue, pendingCheckoutIssue } from '../validators/payment-validator.js';

const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ID = '8c7e9857-7fbb-4c1f-8e6c-42bdcf9fe60a';
const KEY = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const capabilities = { checkoutEnabled: true, provider: 'duitku', environment: 'sandbox', idempotencyKeyRequired: true, reconcileCooldownSeconds: 30 };

test('owner production release still requires valid enabled environment-scoped capabilities', () => {
  assert.equal(PAYMENT_CHECKOUT_RELEASED, true); assert.equal(PAYMENT_SANDBOX_RELEASED, true);
  assert.equal(paymentCheckoutAllowed(capabilities), true);
  assert.equal(paymentCheckoutAllowed({ ...capabilities, environment: 'production' }), true);
  for (const data of [null, {}, { ...capabilities, environment: null },
    { ...capabilities, checkoutEnabled: false }, { ...capabilities, provider: 'other' }, { ...capabilities, idempotencyKeyRequired: false }]) {
    assert.equal(paymentCheckoutAllowed(data), false);
  }
  assert.equal(paymentCheckoutAllowed(capabilities, { released: false, sandboxReleased: false }), false);
  assert.equal(paymentCheckoutAllowed({ ...capabilities, environment: 'production' }, { released: false }), false);
  assert.equal(paymentCheckoutAllowed(capabilities, { sandboxReleased: false }), false);
});

test('sandbox-only service rejects enabled production capabilities before CSRF or POST', async () => {
  const service = createPaymentService({ get: async () => ({ success: true, data: { ...capabilities, environment: 'production' } }),
    synchronizeAccessCsrf: () => assert.fail('production CSRF preparation'), post: () => assert.fail('production POST') }, { released: false, sandboxReleased: true });
  await assert.rejects(service.checkout('basic', KEY), { code: 'PAYMENT_CHECKOUT_DISABLED' });
});

test('sandbox-only checkout uses confirmable server payment environment, not a mismatched response', async () => {
  let calls = 0;
  const service = createPaymentService({ get: async () => ({ success: true, data: capabilities }), synchronizeAccessCsrf: async () => {},
    post: async () => { calls++; return { success: true, data: { publicId: ID, provider: 'duitku', environment: 'production' } }; } }, { sandboxReleased: true });
  await assert.rejects(service.checkout('basic', KEY), { code: 'PAYMENT_RESPONSE_INVALID' }); assert.equal(calls, 1);
});
const payment = { publicId: ID, merchantOrderId: 'KND_order', provider: 'duitku', environment: 'sandbox', targetPlanCode: 'basic', status: 'pending', invoiceState: 'ready', redirectUrl: 'https://app-sandbox.duitku.com/redirect_checkout?reference=example' };
function memoryStorage() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
function harness(overrides = {}) {
  const calls = [];
  const storage = memoryStorage();
  const intents = createIntentStore(() => storage);
  const service = {
    capabilities: async () => capabilities,
    listPayments: async () => { calls.push('list'); return []; },
    checkout: async (plan, key) => { calls.push(['checkout', plan, key]); return payment; },
    getPayment: async id => { calls.push(['get', id]); return { ...payment, publicId: id }; },
    reconcile: async id => { calls.push(['reconcile', id]); return { result: 'verified', paymentPublicId: id, paymentStatus: 'pending' }; },
    currentSubscription: async () => { calls.push('subscription'); return { planCode: 'basic' }; },
    ...overrides,
  };
  let current = USER;
  let time = 0;
  let uuids = 0;
  const options = { service, intents, userPublicId: USER, currentUser: async () => current,
    cards: async () => { calls.push('cards'); return []; }, lock: async (_name, task) => task(),
    uuid: () => { uuids += 1; return KEY; }, now: () => time, version: () => 0 };
  return { calls, storage, intents, service, options, flow: createPaymentFlow(options),
    switchUser: () => { current = OTHER; }, advance: value => { time += value; }, uuids: () => uuids };
}

test('released singleton rereads production capability and sends one fresh-CSRF checkout', async t => {
  const calls = [];
  let enabled = true;
  t.mock.method(paymentService, 'capabilities', async () => ({ ...capabilities, environment: 'production', checkoutEnabled: enabled }));
  t.mock.method(api, 'synchronizeAccessCsrf', async () => { calls.push('csrf'); });
  t.mock.method(api, 'post', async (path, body, options) => {
    calls.push({ path, body, options });
    return { success: true, data: { ...payment, environment: 'production', redirectUrl: 'https://app-prod.duitku.com/redirect_checkout?reference=fixture' } };
  });
  assert.equal((await paymentService.checkout('basic', KEY)).status, 'pending');
  assert.equal(calls[0], 'csrf');
  assert.equal(calls[1].path, '/payments/checkout');
  assert.deepEqual(calls[1].body, { planCode: 'basic' });
  assert.equal(calls[1].options.headers['Idempotency-Key'], KEY);
  assert.equal(calls[1].options.forceAccessCsrf, true);
  assert.equal(calls[1].options.skipRefresh, true);
  enabled = false;
  await assert.rejects(paymentService.checkout('basic', KEY), { code: 'PAYMENT_CHECKOUT_DISABLED' });
  assert.equal(calls.length, 2);
});

test('production release fails closed for disabled, malformed or failed capabilities before CSRF', async () => {
  for (const get of [
    async () => ({ success: true, data: { ...capabilities, environment: 'production', checkoutEnabled: false } }),
    async () => ({ success: true, data: { ...capabilities, environment: 'production', checkoutEnabled: 'true' } }),
    async () => { throw { status: 503 }; },
  ]) {
    const service = createPaymentService({ get, synchronizeAccessCsrf: () => assert.fail('CSRF'), post: () => assert.fail('POST') }, { released: true });
    await assert.rejects(service.checkout('basic', KEY));
  }
});

test('production response cannot silently switch to sandbox or a different provider', async () => {
  for (const data of [{ ...payment }, { ...payment, environment: 'production', provider: 'other' }]) {
    const service = createPaymentService({ get: async () => ({ success: true, data: { ...capabilities, environment: 'production' } }),
      synchronizeAccessCsrf: async () => {}, post: async () => ({ success: true, data }) }, { released: true });
    await assert.rejects(service.checkout('basic', KEY), { code: 'PAYMENT_RESPONSE_INVALID' });
  }
});
for (const data of [null, {}, { ...capabilities, provider: 'unsupported-provider' }, { ...capabilities, environment: null }, { ...capabilities, checkoutEnabled: 'true' }, { ...capabilities, reconcileCooldownSeconds: 0 }, { ...capabilities, idempotencyKeyRequired: false }]) {
  test(`capabilities fail closed for ${JSON.stringify(data)}`, async () => {
    assert.equal(validCapabilities(data), false);
    const service = createPaymentService({ get: async () => ({ success: true, data }) }, { sandboxReleased: true });
    await assert.rejects(service.capabilities(), { code: 'PAYMENT_RESPONSE_INVALID' });
    await assert.rejects(service.checkout('basic', KEY), { code: 'PAYMENT_RESPONSE_INVALID' });
  });
}
test('disabled/failing capabilities never create a payment', async () => {
  let posts = 0;
  for (const get of [async () => ({ success: true, data: { ...capabilities, checkoutEnabled: false } }), async () => { throw new Error('offline'); }]) {
    const service = createPaymentService({ get, post: () => { posts += 1; } }, { sandboxReleased: true });
    await assert.rejects(service.checkout('basic', KEY));
  }
  assert.equal(posts, 0);
});
for (const environment of ['sandbox', 'production']) for (const status of [201, 202]) {
  test(`${environment} HTTP ${status} retains pending status, uses only planCode, UUID, fresh CSRF and cookies`, async () => {
    const calls = [];
    const client = new ApiClient({ baseUrl: 'https://test.invalid/api/v1', cookieSource: () => '', fetchImpl: async (url, options) => {
      calls.push({ url, options });
      const data = url.endsWith('/capabilities') ? { ...capabilities, environment } : url.endsWith('/csrf') ? { csrfToken: 'fresh-csrf' } : { ...payment, environment, redirectUrl: status === 202 ? null : `https://app-${environment === 'sandbox' ? 'sandbox' : 'prod'}.duitku.com/redirect_checkout?reference=fixture` };
      return new Response(JSON.stringify({ success: true, data }), { status: url.endsWith('/checkout') ? status : 200 });
    } });
    const result = await createPaymentService(client, { released: true, sandboxReleased: true }).checkout('basic', KEY);
    assert.equal(result.status, 'pending');
    assert.equal(result.redirectUrl, status === 202 ? null : `https://app-${environment === 'sandbox' ? 'sandbox' : 'prod'}.duitku.com/redirect_checkout?reference=fixture`);
    const { options } = calls.find(call => call.url.endsWith('/checkout'));
    assert.deepEqual(JSON.parse(options.body), { planCode: 'basic' });
    assert.equal(options.headers.get('Idempotency-Key'), KEY);
    assert.equal(options.headers.get('X-CSRF-Token'), 'fresh-csrf');
    assert.equal(options.credentials, 'include');
  });
}
test('invalid plans/UUIDs are rejected before transport', async () => {
  const service = createPaymentService({ get: () => { throw new Error('must not call'); } }, { sandboxReleased: true });
  await assert.rejects(service.checkout('starter', KEY), { code: 'PAYMENT_RESPONSE_INVALID' });
  await assert.rejects(service.checkout('pro', 'not-uuid'), { code: 'PAYMENT_RESPONSE_INVALID' });
});
test('double click/Enter and timeout preserve one intent; explicit retry reads history and reuses UUID', async () => {
  let release;
  const h = harness({ checkout: () => new Promise((_resolve, reject) => { release = () => reject({ code: 'REQUEST_TIMEOUT' }); }) });
  const first = h.flow.purchase('basic');
  assert.equal(await h.flow.purchase('basic'), null);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  release(); await assert.rejects(first, { code: 'REQUEST_TIMEOUT' });
  assert.equal(h.uuids(), 1);
  const saved = h.intents.read(USER);
  assert.equal(saved.key, KEY);
  assert.deepEqual(Object.keys(saved).sort(), ['key', 'planCode', 'publicId', 'userPublicId']);
  h.service.checkout = async (plan, key) => { h.calls.push(['retry', plan, key]); return payment; };
  const reloaded = createPaymentFlow({ ...h.options, intents: createIntentStore(() => h.storage) });
  await reloaded.purchase('basic');
  assert.deepEqual(h.calls.filter(Array.isArray), [['retry', 'basic', KEY]]);
  assert.equal(h.calls.filter(call => call === 'list').length, 2);
  assert.equal(h.uuids(), 1);
});
test('changed plan after ambiguous outcome cannot reuse key or create a new key', async () => {
  const h = harness({ checkout: async () => { throw { code: 'NETWORK_ERROR' }; } });
  await assert.rejects(h.flow.purchase('basic'));
  await assert.rejects(h.flow.purchase('pro'), { code: 'IDEMPOTENCY_CONFLICT' });
  assert.equal(h.uuids(), 1);
});
test('pending history prevents a new checkout even in another tab', async () => {
  let created = false;
  let posts = 0;
  let chain = Promise.resolve();
  const lock = (_name, task) => { const operation = chain.then(task); chain = operation.catch(() => {}); return operation; };
  const h = harness({ listPayments: async () => created ? [payment] : [], checkout: async () => { posts += 1; created = true; return payment; } });
  const tabOne = createPaymentFlow({ ...h.options, lock });
  const tabTwo = createPaymentFlow({ ...h.options, lock, intents: createIntentStore(() => memoryStorage()) });
  const results = await Promise.all([tabOne.purchase('basic'), tabTwo.purchase('basic')]);
  assert.equal(posts, 1); assert.ok(results.every(result => result.publicId === ID));
});
test('shared durable intent preserves UUID across tabs after an ambiguous request with no visible history', async () => {
  let value = null;
  let keys = [];
  const shared = { read: async user => value?.userPublicId === user ? value : null, write: async data => { value = data; }, clear: async () => { value = null; } };
  let chain = Promise.resolve();
  const lock = (_name, task) => { const operation = chain.then(task); chain = operation.catch(() => {}); return operation; };
  const h = harness({ checkout: async (_plan, key) => { keys.push(key); throw { code: 'REQUEST_TIMEOUT' }; } });
  const one = createPaymentFlow({ ...h.options, intents: shared, lock });
  const two = createPaymentFlow({ ...h.options, intents: shared, lock });
  await assert.rejects(one.purchase('basic')); await assert.rejects(two.purchase('basic'));
  assert.deepEqual(keys, [KEY, KEY]); assert.equal(h.uuids(), 1);
});
test('unsupported coordination and blocked shared persistence fail closed before checkout', async () => {
  const h = harness();
  await assert.rejects(createPaymentFlow({ ...h.options, lock: () => undefined }).purchase('basic'), { code: 'PAYMENT_COORDINATION_UNAVAILABLE' });
  const intents = createBrowserIntentStore({ database: () => undefined });
  await assert.rejects(createPaymentFlow({ ...h.options, intents }).purchase('basic'), { code: 'PAYMENT_COORDINATION_UNAVAILABLE' });
  assert.equal(h.calls.filter(Array.isArray).length, 0);
});
test('user switch prevents requests using another user intent', async () => {
  const h = harness(); h.intents.write({ userPublicId: USER, key: KEY, planCode: 'basic' }); h.switchUser();
  await assert.rejects(h.flow.purchase('basic'), { code: 'AUTH_REQUIRED' });
  assert.equal(h.calls.length, 0); assert.equal(h.intents.read(USER), null);
});
test('pending conflict reads owned data.publicId without binding an unrelated key or replacement checkout', async () => {
  const h = harness({ checkout: async () => { throw { code: 'CHECKOUT_PENDING_EXISTS', details: { publicId: ID } }; } });
  await assert.rejects(h.flow.purchase('basic'), { code: 'CHECKOUT_PENDING_EXISTS' });
  assert.equal(h.intents.read(USER).publicId, null);
  assert.equal(h.intents.read(USER).key, KEY);
  assert.deepEqual(h.calls.filter(Array.isArray), [['get', ID]]);
});
test('return lookup prefers publicId and cannot equate it with merchantOrderId', async () => {
  const h = harness(); h.intents.write({ userPublicId: USER, key: KEY, planCode: 'basic', publicId: ID });
  assert.equal((await h.flow.resolveReturn('KND_order')).publicId, ID); assert.deepEqual(h.calls, [['get', ID]]);
  assert.equal(await h.flow.resolveReturn('fake-order'), null);
  h.intents.clear(); h.service.listPayments = async () => [payment];
  assert.equal(await h.flow.resolveReturn(ID), null);
  assert.equal((await h.flow.resolveReturn('KND_order')).publicId, ID);
  assert.equal(await h.flow.resolveReturn('other-user-order'), null);
});
test('owned detail denies inaccessible payment rather than trusting return query', async () => {
  const h = harness({ getPayment: async () => { throw { status: 404, code: 'PAYMENT_NOT_FOUND' }; } });
  h.intents.write({ userPublicId: USER, key: KEY, planCode: 'basic', publicId: ID });
  await assert.rejects(h.flow.resolveReturn('KND_order'), { code: 'PAYMENT_NOT_FOUND' });
});

for (const [label, existing, code] of [
  ['old sandbox', payment, 'PAYMENT_SANDBOX_PENDING'],
  ['unknown environment', { ...payment, environment: null }, 'PAYMENT_PENDING_CONTEXT_CONFLICT'],
  ['legacy provider', { ...payment, provider: 'legacy', environment: 'production' }, 'PAYMENT_PENDING_CONTEXT_CONFLICT'],
  ['different plan', { ...payment, environment: 'production', targetPlanCode: 'pro' }, 'CHECKOUT_PENDING_EXISTS'],
]) {
  test(`production pending ${label} blocks POST/UUID and preserves ambiguous intent`, async () => {
    const h = harness({ capabilities: async () => ({ ...capabilities, environment: 'production' }), listPayments: async () => [existing] });
    const saved = { userPublicId: USER, key: KEY, planCode: 'basic', publicId: null };
    h.intents.write(saved);
    await assert.rejects(h.flow.purchase('basic'), { code });
    assert.equal(h.uuids(), 0);
    assert.deepEqual(h.calls.filter(Array.isArray), []);
    assert.deepEqual(h.intents.read(USER), saved);
  });
}
test('sandbox conflict without storage and elapsed invoice deadline never creates/relabels an order', async () => {
  const old = { ...payment, expiresAt: '2026-10-04T12:08:00Z' };
  const h = harness({ capabilities: async () => ({ ...capabilities, environment: 'production' }), listPayments: async () => [old] });
  await assert.rejects(h.flow.purchase('basic'), { code: 'PAYMENT_SANDBOX_PENDING' });
  await assert.rejects(h.flow.purchase('pro'), { code: 'PAYMENT_SANDBOX_PENDING' });
  assert.equal(h.uuids(), 0); assert.equal(h.intents.read(USER), null);
  assert.equal(old.status, 'pending'); assert.equal(old.environment, 'sandbox');
});
test('compatible pending can be resumed without reassigning its publicId to an unrelated intent', async () => {
  const h = harness({ listPayments: async () => [payment] });
  const saved = { userPublicId: USER, key: KEY, planCode: 'pro', publicId: null };
  h.intents.write(saved);
  assert.equal((await h.flow.purchase('basic')).publicId, ID);
  assert.deepEqual(h.intents.read(USER), saved); assert.equal(h.uuids(), 0);
  assert.deepEqual(h.calls.filter(Array.isArray), [['get', ID]]);
});
test('multiple pending invoices fail closed rather than selecting the first one', async () => {
  const h = harness({ listPayments: async () => [payment, { ...payment, publicId: OTHER }] });
  await assert.rejects(h.flow.purchase('basic'), { code: 'PAYMENT_PENDING_CONTEXT_CONFLICT' });
  assert.equal(h.uuids(), 0); assert.deepEqual(h.calls.filter(Array.isArray), []);
});
test('fresh owned detail is validated when history context was stale', async () => {
  const h = harness({ listPayments: async () => [payment], getPayment: async () => ({ ...payment, environment: 'production' }) });
  await assert.rejects(h.flow.purchase('basic'), { code: 'PAYMENT_PENDING_CONTEXT_CONFLICT' });
  assert.equal(h.uuids(), 0); assert.equal(h.intents.read(USER), null);
});
test('409 old sandbox conflict preserves the submitted key without binding another invoice', async () => {
  let posts = 0;
  const h = harness({ capabilities: async () => ({ ...capabilities, environment: 'production' }),
    checkout: async () => { posts++; throw { code: 'CHECKOUT_PENDING_EXISTS', details: { publicId: ID } }; } });
  await assert.rejects(h.flow.purchase('basic'), { code: 'PAYMENT_SANDBOX_PENDING' });
  assert.equal(posts, 1); assert.equal(h.uuids(), 1);
  assert.equal(h.intents.read(USER).key, KEY); assert.equal(h.intents.read(USER).publicId, null);
});
test('disabled/malformed capabilities also close the orchestration before key creation', async () => {
  for (const data of [null, {}, { ...capabilities, checkoutEnabled: false }]) {
    const h = harness({ capabilities: async () => data });
    await assert.rejects(h.flow.purchase('basic'), { code: 'PAYMENT_CHECKOUT_DISABLED' });
    assert.equal(h.uuids(), 0); assert.deepEqual(h.calls, []);
  }
});
test('server terminal status allows a later explicit production purchase, never countdown auto-purchase', async () => {
  let old = { ...payment };
  const h = harness({ capabilities: async () => ({ ...capabilities, environment: 'production' }), listPayments: async () => [old] });
  await assert.rejects(h.flow.purchase('basic'), { code: 'PAYMENT_SANDBOX_PENDING' });
  h.advance(3600_000); assert.equal(h.uuids(), 0);
  old = { ...old, status: 'canceled' };
  h.service.checkout = async (plan, key) => { h.calls.push(['checkout', plan, key]); return { ...payment, environment: 'production' }; };
  assert.equal((await h.flow.purchase('basic')).environment, 'production');
  assert.equal(h.uuids(), 1);
  assert.deepEqual(h.calls.filter(Array.isArray), [['checkout', 'basic', KEY]]);
});
test('preflight capability rate limit applies cooldown before history/intent/POST', async () => {
  const h = harness({ capabilities: async () => { throw { status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 90 }; } });
  await assert.rejects(h.flow.purchase('basic'), { code: 'RATE_LIMITED' });
  assert.equal(h.flow.remaining('checkout'), 90);
  assert.equal(await h.flow.purchase('basic'), null);
  assert.equal(h.uuids(), 0); assert.deepEqual(h.calls, []);
});
test('return with old saved intent resolves a different order only through owned server history', async () => {
  const newer = { ...payment, publicId: OTHER, environment: 'production', merchantOrderId: 'KND_new', status: 'pending' };
  const h = harness({ listPayments: async () => [payment, newer], getPayment: async id => id === OTHER ? newer : payment });
  const saved = { userPublicId: USER, key: KEY, planCode: 'basic', publicId: ID };
  h.intents.write(saved);
  assert.equal((await h.flow.resolveReturn('KND_new')).publicId, OTHER);
  assert.equal(await h.flow.resolveReturn('unowned-order'), null);
  assert.equal((await h.flow.resolveReturn()).publicId, ID);
  assert.deepEqual(h.intents.read(USER), saved);
  assert.equal(h.uuids(), 0);
});
test('pending classifier never treats paid/expired history as a new checkout blocker', () => {
  const production = { ...capabilities, environment: 'production' };
  assert.equal(pendingCheckoutIssue([{ ...payment, status: 'expired' }, { ...payment, status: 'paid' }], production), '');
  assert.equal(pendingPaymentIssue(payment, production), 'PAYMENT_SANDBOX_PENDING');
  assert.match(paymentErrorMessage({ code: 'PAYMENT_SANDBOX_PENDING' }), /Transaksi uji sebelumnya belum selesai/);
});
test('actual billing checkout handler reports context conflict, not malformed response or redirect', async () => {
  const source = await readFile(new URL('../pages/app/billing.js', import.meta.url), 'utf8');
  const handler = source.match(/async function requestCheckout\(event\) \{[\s\S]*?\n\}/)[0];
  let errorCode; let redirects = 0; let reloads = 0;
  const context = { submitting: false, loading: false, state: { capabilities: { ...capabilities, environment: 'production' } },
    flow: { purchase: async () => payment }, paymentCheckoutAllowed, pendingPaymentIssue, paymentRedirectUrl,
    paymentSessionVersion: () => 0, currentSession: () => true, active: () => true, renderUpgradeOptions: () => {},
    showStatus: () => {}, status: {}, load: async () => { reloads++; }, errorState: error => { errorCode = error.code; }, location: { assign: () => { redirects++; } } };
  runInNewContext(handler, context);
  await context.requestCheckout({ target: { closest: () => ({ disabled: false, dataset: { checkoutPlan: 'basic' } }) } });
  assert.equal(errorCode, 'PAYMENT_SANDBOX_PENDING'); assert.equal(redirects, 0); assert.equal(reloads, 1);
});
test('reconcile outcome is followed by GET detail; paid refreshes subscription/cards and respects absolute cooldown', async () => {
  const h = harness({ getPayment: async () => { h.calls.push('detail'); return { ...payment, status: 'paid' }; } });
  assert.equal((await h.flow.reconcile(ID)).status, 'paid');
  assert.deepEqual(h.calls, [['reconcile', ID], 'detail', 'subscription', 'cards']);
  assert.equal(await h.flow.reconcile(ID), null); assert.equal(h.flow.remaining(ID), 30);
  h.advance(31_000); assert.equal(h.flow.remaining(ID), 0);
  assert.equal(h.calls.length, 4); // Countdown expiration never sends requests.
  await h.flow.reconcile(ID); assert.equal(h.calls.length, 8);
});
test('429 honors Retry-After and minimum 30 seconds without polling', async () => {
  const h = harness({ reconcile: async () => { throw { status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 90 }; } });
  await assert.rejects(h.flow.reconcile(ID)); assert.equal(h.flow.remaining(ID), 90);
  h.advance(89_000); assert.equal(await h.flow.reconcile(ID), null);
  h.advance(1000); assert.equal(h.flow.remaining(ID), 0);
});
test('unsupported provider and HTTP 410 stop processing without a replacement checkout', async () => {
  assert.equal(paymentRedirectUrl({ ...payment, provider: 'unsupported-provider' }), '');
  const h = harness({ reconcile: async () => { throw { status: 410, code: 'HTTP_ERROR' }; } });
  await assert.rejects(h.flow.reconcile(ID), { status: 410 });
  assert.match(paymentErrorMessage({ status: 410 }), /Hubungi bantuan/);
  assert.match(paymentErrorMessage({ status: 410, code: 'PAYMENT_PROVIDER_RETIRED' }), /Hubungi bantuan/);
  assert.equal(h.uuids(), 0);
});

test('API error retains status, Retry-After and request ID without replaying POST', async t => {
  const now = Date.parse('Fri, 02 Oct 2026 12:00:00 GMT');
  t.mock.method(Date, 'now', () => now);
  for (const [raw, expected] of [
    ['30', 30], ['90', 90], ['0', 0],
    ['Fri, 02 Oct 2026 12:01:30 GMT', 90],
    ['Fri, 02 Oct 2026 11:59:00 GMT', 0],
    [null, null], ['', null], ['-30', null], ['1.5', null],
    ['garbage', null], ['2026-10-02', null], ['30 seconds', null],
    ['Fri, 32 Oct 2026 12:00:00 GMT', null],
    ['Fri, 02 Oct 2026 25:00:00 GMT', null], ['9007199254740992', null],
  ]) {
    let requests = 0;
    const headers = { 'X-Request-ID': 'support-fixture-429' };
    if (raw !== null) headers['Retry-After'] = raw;
    const client = new ApiClient({ baseUrl: 'https://test.invalid/api/v1', fetchImpl: async (_url, options) => {
      requests += 1;
      assert.equal(options.credentials, 'include');
      assert.notEqual(options.mode, 'no-cors');
      return Response.json({ success: false, code: 'RATE_LIMITED' }, { status: 429, headers });
    } });
    await assert.rejects(client.post('/payments/checkout', { planCode: 'basic' }, { csrfContext: null }), error => {
      assert.equal(error.status, 429); assert.equal(error.code, 'RATE_LIMITED');
      assert.equal(error.retryAfter, raw); assert.equal(error.retryAfterSeconds, expected, String(raw));
      assert.equal(error.requestId, 'support-fixture-429'); return true;
    });
    assert.equal(requests, 1);
  }
  const client = new ApiClient({ baseUrl: 'https://test.invalid/api/v1', fetchImpl: async () =>
    Response.json({ code: 'RATE_LIMITED' }, { status: 429 }) });
  await assert.rejects(client.get('/payments'), error => {
    assert.equal(error.requestId, null); assert.equal(error.retryAfter, null);
    assert.equal(error.retryAfterSeconds, null); return true;
  });
});

test('capability cooldown fallback and minimum 30 apply to checkout/reconcile without automatic retry', async () => {
  for (const configured of [30, 75]) {
    for (const header of [null, undefined, -30, NaN, 0, 5, 90]) {
      let posts = 0;
      const limited = async () => { posts += 1; throw { status: 429, retryAfterSeconds: header }; };
      const h = harness({ checkout: limited, reconcile: limited });
      h.flow.setCooldown(configured);
      const expected = Math.max(configured, Number.isSafeInteger(header) && header >= 0 ? header : 0);
      await assert.rejects(h.flow.purchase('basic'));
      assert.equal(h.flow.remaining('checkout'), expected);
      assert.equal(await h.flow.purchase('basic'), null);
      await assert.rejects(h.flow.reconcile(ID));
      assert.equal(h.flow.remaining(ID), expected);
      assert.equal(await h.flow.reconcile(ID), null);
      assert.equal(posts, 2);
      h.advance(expected * 1000);
      assert.equal(h.flow.remaining(ID), 0); assert.equal(h.flow.remaining('checkout'), 0);
      assert.equal(posts, 2); // Expiration does not schedule any request.
      await assert.rejects(h.flow.purchase('basic'));
      assert.equal(posts, 3); assert.equal(h.uuids(), 1);
    }
  }
});

test('reconcile in-flight guard blocks rapid clicks before awaiting session or response', async () => {
  let release;
  let posts = 0;
  const h = harness({ reconcile: id => { posts += 1; return new Promise(resolve => {
    release = () => resolve({ result: 'processed', paymentPublicId: id, paymentStatus: 'pending' });
  }); } });
  const first = h.flow.reconcile(ID);
  assert.equal(await h.flow.reconcile(ID), null);
  while (!release) await new Promise(resolve => setImmediate(resolve));
  assert.equal(await h.flow.reconcile(ID), null); assert.equal(posts, 1);
  release(); await first;
  assert.equal(await h.flow.reconcile(ID), null); assert.equal(posts, 1);
});
test('untrusted return query is immediately scrubbed and resultCode cannot activate a plan', async () => {
  const source = await readFile(new URL('../assets/js/payment-return.js', import.meta.url), 'utf8');
  let cleaned;
  const context = { URLSearchParams, location: { search: '?resultCode=00&merchantOrderId=KND_order&reference=private', pathname: '/app/billing/result/' }, history: { replaceState: (_state, _title, value) => { cleaned = value; } } };
  runInNewContext(source, context);
  assert.equal(cleaned, '/app/billing/result/'); assert.equal(context.__KND_PAYMENT_RETURN__, 'KND_order');
  assert.doesNotMatch(source, /resultCode|reference|Storage|console\./);
  const h = harness({ listPayments: async () => [payment] });
  assert.equal((await h.flow.resolveReturn(context.__KND_PAYMENT_RETURN__)).status, 'pending');
  assert.ok(!h.calls.includes('subscription'));
});
test('storage corruption/blocking cannot crash return flow or persist personal data', () => {
  const storage = memoryStorage(); storage.setItem(PAYMENT_INTENT_KEY, '{bad');
  const corrupt = createIntentStore(() => storage); assert.equal(corrupt.read(USER), null);
  const blocked = createIntentStore(() => { throw new Error('denied'); });
  blocked.write({ userPublicId: USER, key: KEY, planCode: 'basic', publicId: ID, email: 'private', redirectUrl: 'private' });
  assert.equal(blocked.read(USER).publicId, ID); assert.equal(blocked.read(OTHER), null);
  blocked.clear(); assert.equal(blocked.read(USER), null);
});
test('strict redirect rejects hostile URLs, extra queries, mismatched environments and non-pending payments', () => {
  assert.equal(paymentRedirectUrl(payment), payment.redirectUrl);
  assert.equal(paymentRedirectUrl({ ...payment, environment: 'production', redirectUrl: 'https://app-prod.duitku.com/redirect_checkout?reference=ok' }), 'https://app-prod.duitku.com/redirect_checkout?reference=ok');
  for (const redirectUrl of ['http://app-sandbox.duitku.com/redirect_checkout?reference=x', 'https://app-sandbox.duitku.com.evil.test/redirect_checkout?reference=x', 'https://evil.test/redirect_checkout?reference=x', 'https://user:pass@app-sandbox.duitku.com/redirect_checkout?reference=x', 'https://app-sandbox.duitku.com:444/redirect_checkout?reference=x', 'https://app-sandbox.duitku.com/other?reference=x', 'https://app-prod.duitku.com/redirect_checkout?reference=x', payment.redirectUrl + '&x=1', payment.redirectUrl + '&reference=2', payment.redirectUrl + '#fragment', 'https://app-sandbox.duitku.com/redirect_checkout?reference=%20', 'javascript:alert(1)']) {
    assert.equal(paymentRedirectUrl({ ...payment, redirectUrl }), '', redirectUrl);
  }
  assert.equal(paymentRedirectUrl({ ...payment, status: 'paid' }), '');
  assert.equal(paymentRedirectUrl({ ...payment, environment: null }), '');
});
test('production redirect allowlist rejects sandbox, hostile hosts, extra parameters and unsafe URL parts', () => {
  const production = { ...payment, environment: 'production', redirectUrl: 'https://app-prod.duitku.com/redirect_checkout?reference=fixture' };
  assert.equal(paymentRedirectUrl(production), production.redirectUrl);
  for (const redirectUrl of [payment.redirectUrl, 'https://app-prod.duitku.com.evil.test/redirect_checkout?reference=x',
    production.redirectUrl + '&returnUrl=https://evil.test', production.redirectUrl + '&reference=duplicate',
    production.redirectUrl + '#fragment', production.redirectUrl.replace('https:', 'http:'),
    'https://user:password@app-prod.duitku.com/redirect_checkout?reference=x',
    'https://app-prod.duitku.com:444/redirect_checkout?reference=x',
    'https://app-prod.duitku.com/other?reference=x', 'https://app-prod.duitku.com/redirect_checkout?reference=%20']) {
    assert.equal(paymentRedirectUrl({ ...production, redirectUrl }), '', redirectUrl);
  }
});
for (const [status, code] of [[401, 'AUTH_REQUIRED'], [403, 'CSRF_INVALID'], [403, 'PAYMENT_SANDBOX_FORBIDDEN'], [422, 'VALIDATION_ERROR'], [429, 'RATE_LIMITED'], [503, 'PAYMENT_CHECKOUT_DISABLED'], [503, 'PAYMENT_GATEWAY_UNAVAILABLE'], [500, 'HTTP_ERROR']]) {
  test(`checkout ${status} ${code} never retries POST and retains safe error data`, async () => {
    let posts = 0;
    const client = new ApiClient({ baseUrl: 'https://test.invalid/api/v1', cookieSource: () => '', fetchImpl: async (url, options) => {
      if (url.endsWith('/capabilities')) return Response.json({ success: true, data: capabilities });
      if (url.endsWith('/csrf')) return Response.json({ success: true, data: { csrfToken: 'fresh' } });
      posts += 1;
      return Response.json({ success: false, code, message: 'unsafe internal provider path', errors: ['safe'] }, { status });
    } });
    await assert.rejects(createPaymentService(client, { sandboxReleased: true }).checkout('basic', KEY), { status, code });
    assert.equal(posts, 1);
    assert.doesNotMatch(paymentErrorMessage({ status, code }), /unsafe internal/);
  });
}
test('API refresh-once for capabilities retains key/body for the subsequent single checkout', async () => {
  let reads = 0;
  const posts = [];
  const client = new ApiClient({ baseUrl: 'https://test.invalid/api/v1', cookieSource: () => 'csrf_token=csrf', fetchImpl: async (url, options) => {
    if (url.endsWith('/capabilities')) {
      reads += 1;
      if (reads === 1) return Response.json({ code: 'AUTH_REQUIRED' }, { status: 401 });
      return Response.json({ success: true, data: capabilities });
    }
    if (url.endsWith('/csrf')) return Response.json({ data: { csrfToken: 'fresh' } });
    posts.push([url, options.headers.get('Idempotency-Key'), options.body]);
    return Response.json({ success: true, data: payment });
  } });
  await createPaymentService(client, { sandboxReleased: true }).checkout('pro', KEY);
  assert.equal(reads, 2); assert.equal(posts.length, 2);
  assert.deepEqual(posts[1].slice(1), [KEY, JSON.stringify({ planCode: 'pro' })]);
});

test('capabilities are reread for each user and checkout attempt, never cached across accounts', async () => {
  let allowed = true;
  let reads = 0;
  let posts = 0;
  const service = createPaymentService({
    get: async () => { reads += 1; return { success: true, data: { ...capabilities, checkoutEnabled: allowed } }; },
    synchronizeAccessCsrf: async () => 'fresh',
    post: async () => { posts += 1; return { success: true, data: payment }; },
  }, { sandboxReleased: true });
  assert.equal((await service.capabilities()).checkoutEnabled, true);
  allowed = false;
  assert.equal((await service.capabilities()).checkoutEnabled, false);
  await assert.rejects(service.checkout('basic', KEY), { code: 'PAYMENT_CHECKOUT_DISABLED' });
  assert.equal(reads, 3); assert.equal(posts, 0);
});

test('sandbox denial is distinct from CSRF and auth, without refresh or automatic retry', async () => {
  const paths = [];
  const client = new ApiClient({ baseUrl: 'https://test.invalid/api/v1', cookieSource: () => '', fetchImpl: async url => {
    paths.push(url);
    if (url.endsWith('/capabilities')) return Response.json({ success: true, data: capabilities });
    if (url.endsWith('/csrf')) return Response.json({ success: true, data: { csrfToken: 'fresh' } });
    return Response.json({ success: false, code: 'PAYMENT_SANDBOX_FORBIDDEN' }, { status: 403 });
  } });
  await assert.rejects(createPaymentService(client, { sandboxReleased: true }).checkout('basic', KEY), { status: 403, code: 'PAYMENT_SANDBOX_FORBIDDEN' });
  assert.equal(paths.filter(path => path.endsWith('/checkout')).length, 1);
  assert.equal(paths.filter(path => path.endsWith('/csrf')).length, 1);
  assert.equal(paths.some(path => path.endsWith('/refresh')), false);
  assert.equal(paymentErrorMessage({ status: 403, code: 'PAYMENT_SANDBOX_FORBIDDEN' }), 'Pembayaran uji hanya tersedia untuk akun pengujian yang disetujui');
});

test('billing sandbox denial invalidates checkout capability and displays the exact safe message', async () => {
  const source = await readFile(new URL('../pages/app/billing.js', import.meta.url), 'utf8');
  const handler = source.match(/function errorState\(error\) \{[\s\S]*?\n\}/)[0];
  const state = { capabilities: { ...capabilities } };
  let message;
  let renders = 0;
  runInNewContext(`${handler}; errorState({status:403,code:'PAYMENT_SANDBOX_FORBIDDEN'})`, {
    state, active: () => true, status: {}, showStatus: (_node, text) => { message = text; },
    paymentErrorMessage, renderUpgradeOptions: () => { renders += 1; },
    location: { assign: () => assert.fail('sandbox rejection is not an auth redirect') },
  });
  assert.equal(state.capabilities, null);
  assert.equal(message, 'Pembayaran uji hanya tersedia untuk akun pengujian yang disetujui');
  assert.equal(renders, 1);
});

test('checkout 429 uses absolute Retry-After and retains the intent for manual retry', async () => {
  let posts = 0;
  const h = harness({ checkout: async () => { posts += 1; throw { status: 429, code: 'RATE_LIMITED', retryAfterSeconds: 60 }; } });
  await assert.rejects(h.flow.purchase('basic'));
  assert.equal(await h.flow.purchase('basic'), null);
  h.advance(60_000); await assert.rejects(h.flow.purchase('basic'));
  assert.equal(posts, 2); assert.equal(h.uuids(), 1);
});
test('successful HTTP response with success false/malformed checkout remains ambiguous', async () => {
  for (const result of [{ success: false, data: payment }, { success: true, data: {} }]) {
    const service = createPaymentService({ get: async () => ({ success: true, data: capabilities }), synchronizeAccessCsrf: async () => {}, post: async () => result }, { sandboxReleased: true });
    await assert.rejects(service.checkout('basic', KEY), { code: 'PAYMENT_RESPONSE_INVALID' });
  }
});
test('runtime JS/HTML contains no provider SDK, merchant key/signature or unsafe payment DOM sink', async () => {
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
      if (entry.isDirectory()) await inspect(target);
      else if (/\.(js|html)$/.test(entry.name)) {
        const source = await readFile(target, 'utf8');
        assert.doesNotMatch(source, /midtrans|snapToken|snap\.pay|snap\.js|x-duitku-(?:merchantcode|signature)|DUITKU_(?:API_KEY|MERCHANT_CODE)/i, target.pathname);
      }
    }
  }
  for (const folder of ['services', 'pages', 'config', 'app', 'assets/js']) await inspect(new URL('../' + folder + '/', import.meta.url));
  const billing = await readFile(new URL('../pages/app/billing.js', import.meta.url), 'utf8');
  assert.doesNotMatch(billing, /innerHTML|outerHTML|console\./);
  const result = await readFile(new URL('../app/billing/result/index.html', import.meta.url), 'utf8');
  assert.match(result, /noindex/); assert.match(result, /name="referrer" content="no-referrer"/);
  assert.ok(result.indexOf('payment-return.js') < result.indexOf('site-theme.js'));
});
