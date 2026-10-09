// Isolated local mock only. This script never uses production/backend credentials.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createLocalFrontendServer } from './local-server.mjs';
import { launchBrowser, waitFor } from '../tests/helpers/cdp-browser.mjs';

const USER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ID = '8c7e9857-7fbb-4c1f-8e6c-42bdcf9fe60a';
const fixture = { publicId: ID, merchantOrderId: 'KND_local_mock', provider: 'duitku', environment: 'sandbox',
  status: 'pending', invoiceState: 'ready', planName: 'Basic', targetPlanCode: 'basic', amount: 55000, currency: 'IDR', durationDays: 365,
  redirectUrl: null, createdAt: '2026-10-02T11:00:00.000Z' };
const requests = [];
let frontendOrigin;
const state = { user: USER, list: [], payment: { ...fixture }, capabilities: 'enabled', failList: false, reconcile: 'paid', checkout: 'ready', expose: false, delay: 0, retryAfter: '90', requestId: 'local-support-429', reports: {} };
const api = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://local.test').pathname;
  if (request.headers.origin === frontendOrigin) {
    response.setHeader('Access-Control-Allow-Origin', frontendOrigin);
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, X-Request-ID, Idempotency-Key');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (state.expose) response.setHeader('Access-Control-Expose-Headers', 'Retry-After, X-Request-ID');
  }
  if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
  let body = '';
  for await (const chunk of request) body += chunk;
  requests.push({ method: request.method, pathname, body, key: request.headers['idempotency-key'], csrf: request.headers['x-csrf-token'] });
  const reply = (data, status = 200, code = '') => {
    response.writeHead(status, { 'content-type': 'application/json', ...(status === 429 && state.retryAfter !== null ? { 'retry-after': state.retryAfter } : {}), ...(state.requestId ? { 'x-request-id': state.requestId } : {}) });
    response.end(JSON.stringify(status < 400 ? { success: true, data } : { success: false, code, message: 'Unsafe provider/private diagnostic' }));
  };
  if (pathname === '/api/v1/me') return state.user ? reply({ user: { publicId: state.user, email: 'fixture@example.test', roles: ['super_admin'] } }) : reply(null, 401, 'AUTH_REQUIRED');
  if (pathname === '/api/v1/admin/statistics') return reply({ newFeedback: 0 });
  if (pathname === '/api/v1/admin/reports') return reply(state.reports);
  if (pathname === '/api/v1/auth/csrf') return reply({ csrfToken: 'local-mock-csrf' });
  if (pathname === '/api/v1/auth/login') { state.user = USER; return reply({ user: { publicId: USER } }); }
  if (pathname === '/api/v1/auth/logout') { state.user = null; return reply(null); }
  if (pathname === '/api/v1/auth/refresh') return reply(null, 401, 'AUTH_REQUIRED');
  if (pathname === '/api/v1/payments/capabilities') {
    if (state.capabilities === 'error') return reply(null, 503, 'HTTP_ERROR');
    if (state.capabilities === 'malformed') return reply({ checkoutEnabled: true });
    return reply({ checkoutEnabled: ['enabled', 'production'].includes(state.capabilities), provider: 'duitku', environment: state.capabilities === 'production' ? 'production' : 'sandbox', idempotencyKeyRequired: true, reconcileCooldownSeconds: 30 });
  }
  if (pathname === '/api/v1/payments' && request.method === 'GET') {
    const payments = state.list;
    if (state.delay) await new Promise(resolve => setTimeout(resolve, state.delay));
    return state.failList ? reply(null, 500, 'HTTP_ERROR') : reply(payments);
  }
  if (pathname === `/api/v1/payments/${ID}`) return reply(state.payment);
  if (pathname === `/api/v1/payments/${ID}/reconcile`) {
    if (state.reconcile === 'limited') return reply(null, 429, 'RATE_LIMITED');
    state.payment.status = state.reconcile === 'canceled' ? 'canceled' : 'paid'; state.list = [{ ...state.payment }];
    return reply({ result: 'verified', paymentPublicId: ID, paymentStatus: state.payment.status });
  }
  if (request.method === 'GET' && pathname.startsWith('/api/v1/payments/')) {
    const owned = state.list.find(payment => pathname === `/api/v1/payments/${payment.publicId}`);
    if (owned) return reply(owned);
  }
  if (pathname === '/api/v1/payments/checkout') {
    assert.deepEqual(JSON.parse(body), { planCode: 'basic' });
    assert.ok(request.headers['idempotency-key']); assert.equal(request.headers['x-csrf-token'], 'local-mock-csrf');
    if (state.checkout === 'forbidden') return reply(null, 403, 'PAYMENT_SANDBOX_FORBIDDEN');
    if (state.checkout === 'ambiguous') return reply(null, 503, 'PAYMENT_PROVIDER_UNAVAILABLE');
    if (state.checkout === 'disabled') return reply(null, 503, 'PAYMENT_CHECKOUT_DISABLED');
    state.list = [{ ...state.payment }]; return reply(state.payment, state.checkout === 'created' ? 201 : 202);
  }
  if (pathname === '/api/v1/subscriptions/current') return reply(state.payment.status === 'paid' ? { planCode: 'basic', endsAt: '2027-10-02T00:00:00.000Z' } : null);
  if (pathname === '/api/v1/cards') return reply([]);
  return reply(null, 404, 'PAYMENT_NOT_FOUND');
});
async function listen(server) { await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); return server.address().port; }
const backendPort = await listen(api);
const frontend = createLocalFrontendServer({ backendOrigin: new URL(`http://127.0.0.1:${backendPort}`) });
const frontendPort = await listen(frontend);
const origin = `http://127.0.0.1:${frontendPort}`;
frontendOrigin = origin;
let browser;
let passed = 0;
const pass = label => { passed += 1; console.log(`PASS ${label}`); };
try {
  browser = await launchBrowser();
  const tab = await browser.tab();
  async function page(route = '/app/billing/') {
    await tab.navigate(origin + route);
    await waitFor(async () => {
      const text = await tab.evaluate("document.querySelector('[data-form-status]')?.textContent || ''");
      return text !== '' && !/Memuat/.test(text) || await tab.evaluate("Boolean(document.querySelector('[data-payment-history]')?.children.length)");
    }, 'billing loaded');
    await waitFor(async () => !(await tab.evaluate("document.querySelector('[data-payment-history]')?.getAttribute('aria-busy') === 'true'")), 'billing settled');
  }
  const clearIntents = () => tab.evaluate("(async()=>{const {paymentIntents}=await import('/utils/payment-intent.js');await paymentIntents.clear()})()");
  for (const capabilities of ['disabled', 'enabled', 'production', 'malformed', 'error']) {
    state.capabilities = capabilities;
    await page();
    const enabled = ['enabled', 'production'].includes(capabilities);
    assert.equal(await tab.evaluate("[...document.querySelectorAll('[data-checkout-plan]')].every(button=>button.disabled)"), !enabled);
    const label = enabled ? capabilities === 'production' ? 'Pembayaran online' : 'Pembayaran uji — Sandbox' : 'Under development';
    assert.equal(await tab.evaluate("document.querySelector('[data-upgrade-eyebrow]').textContent"), label);
    assert.equal(await tab.evaluate("document.querySelector('[data-status-badge]').textContent"), label);
    assert.equal(await tab.evaluate("document.querySelector('.billing-plan__lock').hidden"), enabled);
    assert.equal(await tab.evaluate("document.querySelector('.billing-notify').hidden"), enabled);
    assert.equal(await tab.evaluate("document.querySelector('[data-upgrade-card]').classList.contains('billing-plan--locked')"), !enabled);
    if (capabilities === 'production') {
      assert.equal(await tab.evaluate("document.querySelector('[data-checkout-plan]').textContent"), 'Bayar melalui Duitku');
      assert.doesNotMatch(await tab.evaluate("document.querySelector('[data-upgrade-note]').textContent"), /Sandbox/);
    }
    assert.equal(requests.filter(request => request.pathname.endsWith('/checkout')).length, 0);
    pass(`capabilities ${capabilities}: environment gate, accessible labels, no automatic checkout`);
  }
  state.capabilities = 'production';
  await page('/app/billing/?intent=pro');
  assert.match(await tab.evaluate("document.querySelector('[data-form-status]').textContent"), /Pilih paket yang sesuai/);
  assert.doesNotMatch(await tab.evaluate("document.querySelector('[data-form-status]').textContent"), /Under development/);
  pass('production registration intent gets accurate guidance without automatic purchase');
  for (const [width, height, label] of [[390, 844, 'mobile'], [768, 1024, 'tablet'], [1440, 900, 'desktop']]) {
    await tab.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    const metrics = await tab.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll("h1").length,main:document.querySelectorAll("main").length})');
    assert.ok(metrics.scroll <= metrics.width + 1, JSON.stringify(metrics));
    assert.equal(metrics.h1, 1); assert.equal(metrics.main, 1);
    assert.equal(await tab.evaluate("getComputedStyle(document.querySelector('.billing-plan__lock')).display"), 'none');
    assert.equal(await tab.evaluate("getComputedStyle(document.querySelector('.billing-notify')).display"), 'none');
    pass(`${label}: production billing layout and hidden unavailable controls`);
  }
  state.capabilities = 'enabled';
  state.delay = 1000;
  await tab.navigate(origin + '/app/billing/');
  assert.equal(await tab.evaluate("document.querySelector('[data-payment-history]').getAttribute('aria-busy')"), 'true');
  assert.match(await tab.evaluate("document.querySelector('[data-form-status]').textContent"), /Memuat/);
  assert.equal(await tab.evaluate("[...document.querySelectorAll('[data-checkout-plan]')].every(button=>button.disabled)"), true);
  await waitFor(async () => /Belum ada/.test(await tab.evaluate("document.querySelector('[data-payment-history]').textContent")), 'loading resolved');
  state.delay = 0;
  pass('loading state exposes aria-busy/status and disabled actions');
  assert.match(await tab.evaluate("document.querySelector('[data-payment-history]').textContent"), /Belum ada riwayat/);
  pass('empty history state');
  state.failList = true; await page();
  assert.equal(await tab.evaluate("document.querySelector('[data-billing-retry]').hidden"), false);
  assert.doesNotMatch(await tab.evaluate('document.body.textContent'), /Unsafe provider/);
  state.failList = false;
  await tab.evaluate("document.querySelector('[data-billing-retry]').click()");
  await waitFor(async () => /Belum ada/.test(await tab.evaluate("document.querySelector('[data-payment-history]').textContent")), 'retry recovered');
  pass('safe error and manual retry');
  state.list = [{ ...fixture }]; state.payment = { ...fixture };
  await page('/app/billing/result/?resultCode=00&merchantOrderId=KND_local_mock&reference=private');
  assert.equal(await tab.evaluate('location.search'), '');
  assert.match(await tab.evaluate("document.querySelector('[data-payment-history]').textContent"), /Menunggu/);
  assert.doesNotMatch(await tab.evaluate("document.querySelector('[data-subscription-summary]').textContent"), /BASIC/);
  pass('forged resultCode is scrubbed; only owned API data controls status');
  for (const [width, height, label] of [[390, 844, 'mobile'], [768, 1024, 'tablet'], [1440, 900, 'desktop']]) {
    await tab.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    const metrics = await tab.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth,h1:document.querySelectorAll("h1").length,main:document.querySelectorAll("main").length})');
    assert.ok(metrics.scroll <= metrics.width + 1, JSON.stringify(metrics)); assert.equal(metrics.h1, 1); assert.equal(metrics.main, 1);
    pass(`${label}: responsive result page, one H1/main`);
  }
  await tab.evaluate('document.activeElement?.blur()');
  await tab.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await tab.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  assert.ok(await tab.evaluate('document.activeElement.tagName !== "BODY"'));
  pass('keyboard Tab focus');
  const beforeSubscription = requests.filter(request => request.pathname.endsWith('/subscriptions/current')).length;
  const beforeCards = requests.filter(request => request.pathname.endsWith('/cards')).length;
  await tab.evaluate("document.querySelector('[data-reconcile-payment]').click();document.querySelector('[data-reconcile-payment]').click()");
  await waitFor(async () => /Berhasil/.test(await tab.evaluate("document.querySelector('[data-payment-history]').textContent")), 'paid refreshed');
  assert.equal(requests.filter(request => request.pathname.endsWith('/reconcile')).length, 1);
  assert.ok(requests.filter(request => request.pathname.endsWith('/subscriptions/current')).length > beforeSubscription);
  assert.ok(requests.filter(request => request.pathname.endsWith('/cards')).length > beforeCards);
  assert.equal(await tab.evaluate("document.querySelector('[data-reconcile-payment]').disabled"), true);
  pass('manual reconcile double-click, paid entitlement refetch, cooldown');
  state.payment = { ...fixture }; state.list = [{ ...fixture }]; state.reconcile = 'limited';
  await page();
  await tab.evaluate("document.querySelector('[data-reconcile-payment]').click()");
  await waitFor(async () => /detik/.test(await tab.evaluate("document.querySelector('[data-reconcile-payment]').textContent")), '429 cooldown');
  assert.match(await tab.evaluate("document.querySelector('[data-form-status]').textContent"), /Terlalu banyak/);
  pass('429 Retry-After cooldown');
  state.list = [{ ...fixture, provider: 'unsupported-provider', redirectUrl: 'https://unsupported-provider.invalid' }]; await page();
  assert.match(await tab.evaluate("document.querySelector('[data-payment-history]').textContent"), /Provider pembayaran tidak didukung/);
  assert.match(await tab.evaluate("document.querySelector('[data-payment-history]').textContent"), /Provider historis: unsupported-provider/);
  assert.equal(await tab.evaluate("document.querySelector('[data-payment-history] a') === null"), true);
  assert.equal(await tab.evaluate("document.querySelector('[data-reconcile-payment]').disabled"), true);
  pass('unsupported provider cannot redirect or reconcile');
  state.list = []; state.payment = { ...fixture }; state.reconcile = 'paid';
  await page();
  const setup = `(async()=>{const {api}=await import('/services/api-client.js');const {createPaymentService}=await import('/services/payment-service.js');const {createPaymentFlow}=await import('/services/payment-flow.js');const {paymentIntents}=await import('/utils/payment-intent.js');globalThis.qaIntents=paymentIntents;globalThis.qaFlow=createPaymentFlow({service:createPaymentService(api,{sandboxReleased:true}),intents:paymentIntents,userPublicId:'${USER}',currentUser:async()=> (await api.get('/me')).user.publicId,cards:async()=>[]});return true})()`;
  await tab.evaluate(setup); await tab.evaluate('qaIntents.clear()');
  const second = await browser.tab(); await second.navigate(origin + '/app/billing/');
  await waitFor(async () => (await second.evaluate("document.querySelector('[data-payment-history]')?.textContent || ''")).includes('Belum ada'), 'second tab');
  await second.evaluate(setup);
  const before = requests.filter(request => request.pathname.endsWith('/checkout')).length;
  await Promise.all([tab.evaluate("qaFlow.purchase('basic')"), second.evaluate("qaFlow.purchase('basic')")]);
  assert.equal(requests.filter(request => request.pathname.endsWith('/checkout')).length, before + 1);
  pass('real Web Locks + IndexedDB multi-tab: one POST (202 mock)');
  await tab.evaluate('qaIntents.clear()'); state.list = []; state.checkout = 'ambiguous';
  await tab.evaluate("qaFlow.purchase('basic').catch(()=>null)");
  await second.evaluate("qaFlow.purchase('basic').catch(()=>null)");
  const ambiguous = requests.filter(request => request.pathname.endsWith('/checkout')).slice(-2);
  assert.equal(ambiguous[0].key, ambiguous[1].key);
  pass('ambiguous POST across tabs retains same UUID');
  const saved = await tab.evaluate('JSON.parse(sessionStorage.getItem("knd.payment.intent"))');
  assert.deepEqual(Object.keys(saved).sort(), ['key', 'planCode', 'publicId', 'userPublicId']);
  pass('storage contains only intent metadata');
  assert.equal(await tab.evaluate(`(async()=>{const {authService}=await import('/services/auth-service.js');await authService.login({email:'fixture@example.test',password:'fixture-only'});return (await qaIntents.read('${USER}')).key})()`), saved.key);
  pass('same-user re-authentication preserves ambiguous intent UUID');
  state.user = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const beforeSwitch = requests.filter(request => request.pathname.endsWith('/checkout')).length;
  assert.equal(await tab.evaluate("qaFlow.purchase('basic').catch(error=>error.code)"), 'AUTH_REQUIRED');
  assert.equal(requests.filter(request => request.pathname.endsWith('/checkout')).length, beforeSwitch);
  pass('changed user blocks old controller and clears old intent');
  state.user = USER;
  await tab.evaluate('qaIntents.clear()');
  await tab.evaluate("document.querySelector('.app-shell__logout').click()");
  await waitFor(async () => (await tab.evaluate('location.pathname')) === '/login/', 'logout redirect');
  await waitFor(async () => (await second.evaluate('qaIntents.read("' + USER + '")')) === null, 'other tab intent cleared');
  assert.equal(requests.filter(request => request.pathname.endsWith('/auth/logout')).length, 1);
  pass('logout regression and cross-tab cleanup');
  state.user = USER; state.list = [{ ...fixture }]; state.payment = { ...fixture }; state.reconcile = 'limited';
  const corsTab = await browser.tab();
  await corsTab.send('Page.addScriptToEvaluateOnNewDocument', { source: `globalThis.__KND_CONFIG__={apiBaseUrl:'http://127.0.0.1:${backendPort}/api/v1'};` });
  async function corsPage() {
    await corsTab.navigate(origin + '/app/billing/');
    await waitFor(async () => await corsTab.evaluate("Boolean(document.querySelector('[data-reconcile-payment]')) && document.querySelector('[data-payment-history]').getAttribute('aria-busy') !== 'true'"), 'cross-origin billing');
    await corsTab.evaluate("document.querySelector('[data-reconcile-payment]').click()");
    await waitFor(async () => /Terlalu banyak/.test(await corsTab.evaluate("document.querySelector('[data-form-status]').textContent")), 'cross-origin 429');
    await waitFor(async () => /detik/.test(await corsTab.evaluate("document.querySelector('[data-reconcile-payment]').textContent")), 'cross-origin countdown');
    return Number((await corsTab.evaluate("document.querySelector('[data-reconcile-payment]').textContent")).match(/\d+/)[0]);
  }
  const fallback = await corsPage(); assert.ok(fallback > 0 && fallback <= 30);
  state.expose = true;
  const exposed = await corsPage(); assert.ok(exposed > 60 && exposed <= 90);
  pass('cross-origin 429: safe fallback without exposed header; Retry-After honored when exposed');
  const inspectHeaders = `(async()=>{const {api}=await import('/services/api-client.js');try{await api.get('/payments/${ID}/reconcile')}catch(error){return {status:error.status,requestId:error.requestId,retryAfter:error.retryAfter,retryAfterSeconds:error.retryAfterSeconds}}})()`;
  // Read-only GET to the mock error fixture: never a real reconcile mutation.
  assert.deepEqual(await corsTab.evaluate(inspectHeaders), { status: 429, requestId: state.requestId, retryAfter: '90', retryAfterSeconds: 90 });
  pass('exposed error headers survive API client normalization in the browser');
  state.retryAfter = new Date(Date.now() + 120000).toUTCString();
  const dateWait = await corsPage(); assert.ok(dateWait > 90 && dateWait <= 120);
  pass('cross-origin HTTP-date Retry-After drives countdown');
  state.retryAfter = null; state.requestId = null;
  const missing = await corsPage(); assert.ok(missing > 0 && missing <= 30);
  assert.deepEqual(await corsTab.evaluate(inspectHeaders), { status: 429, requestId: null, retryAfter: null, retryAfterSeconds: null });
  const beforeCooldown = requests.filter(request => request.method === 'POST' && request.pathname.endsWith('/reconcile')).length;
  await corsTab.evaluate("document.querySelector('[data-reconcile-payment]').click();document.querySelector('[data-reconcile-payment]').click()");
  assert.equal(requests.filter(request => request.method === 'POST' && request.pathname.endsWith('/reconcile')).length, beforeCooldown);
  pass('missing headers fall back safely; cooldown clicks never submit');

  state.capabilities = 'enabled'; state.list = [{ ...fixture }];
  await page();
  assert.match(await tab.evaluate("document.querySelector('[data-upgrade-note]').textContent"), /Pembayaran uji — Sandbox.*database yang sama/);
  assert.match(await tab.evaluate("document.querySelector('[data-payment-history]').textContent"), /Pembayaran uji — Sandbox/);
  pass('sandbox label and shared-database benefit warning are visible');

  state.delay = 1000;
  await tab.navigate(origin + '/app/billing/');
  await waitFor(async () => await tab.evaluate("document.querySelector('[data-payment-history]')?.getAttribute('aria-busy') === 'true'"), 'delayed billing');
  state.user = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'; state.capabilities = 'disabled'; state.list = [];
  await tab.evaluate("(async()=>{const {paymentSessionChanged}=await import('/utils/payment-intent.js');await paymentSessionChanged('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')})()");
  await waitFor(async () => await tab.evaluate("document.querySelector('[data-payment-history]')?.getAttribute('aria-busy') !== 'true'"), 'stale billing settled');
  assert.doesNotMatch(await tab.evaluate("document.querySelector('[data-upgrade-note]').textContent"), /Sandbox/);
  assert.match(await tab.evaluate("document.querySelector('[data-payment-history]').textContent"), /Belum ada/);
  assert.match(await tab.evaluate("document.querySelector('[data-form-status]').textContent"), /Sesi akun berubah/);
  const capabilitiesReads = requests.filter(request => request.pathname.endsWith('/capabilities')).length;
  state.delay = 0; await page();
  assert.equal(await tab.evaluate("[...document.querySelectorAll('[data-checkout-plan]')].every(button=>button.disabled)"), true);
  assert.ok(requests.filter(request => request.pathname.endsWith('/capabilities')).length > capabilitiesReads);
  assert.match(await tab.evaluate("document.querySelector('[data-payment-history]').textContent"), /Belum ada/);
  pass('user switch clears capabilities and discards late previous-account responses');

  state.user = USER; state.capabilities = 'enabled'; state.checkout = 'forbidden';
  await page(); await tab.evaluate(setup); await tab.evaluate('qaIntents.clear()');
  const beforeForbidden = requests.length;
  assert.equal(await tab.evaluate("qaFlow.purchase('basic').catch(error=>error.code)"), 'PAYMENT_SANDBOX_FORBIDDEN');
  const denied = requests.slice(beforeForbidden);
  assert.equal(denied.filter(request => request.pathname.endsWith('/checkout')).length, 1);
  assert.equal(denied.some(request => request.pathname.endsWith('/refresh')), false);
  assert.equal(denied.filter(request => request.pathname.endsWith('/csrf')).length, 1);
  // Test the actual page event/error owner, not only the injected service flow.
  await tab.evaluate('qaIntents.clear()');
  await tab.evaluate("document.querySelector('[data-checkout-plan]').click();document.querySelector('[data-checkout-plan]').click()");
  await waitFor(async () => /akun pengujian/.test(await tab.evaluate("document.querySelector('[data-form-status]').textContent")), 'sandbox denial UI');
  assert.equal(await tab.evaluate("[...document.querySelectorAll('[data-checkout-plan]')].every(button=>button.disabled)"), true);
  pass('sandbox forbidden closes real UI after explicit click without retry');

  state.checkout = 'ready'; state.list = []; state.payment = { ...fixture };
  await tab.evaluate('qaIntents.clear()'); await page();
  const beforePageCheckout = requests.filter(request => request.pathname.endsWith('/checkout')).length;
  await tab.evaluate("document.querySelector('[data-checkout-plan]').click();document.querySelector('[data-checkout-plan]').click()");
  await waitFor(async () => /sedang diverifikasi/.test(await tab.evaluate("document.querySelector('[data-form-status]').textContent")), 'explicit sandbox pending');
  const pageCheckouts = requests.filter(request => request.pathname.endsWith('/checkout'));
  assert.equal(pageCheckouts.length, beforePageCheckout + 1);
  assert.deepEqual(JSON.parse(pageCheckouts.at(-1).body), { planCode: 'basic' });
  assert.ok(pageCheckouts.at(-1).key); assert.equal(pageCheckouts.at(-1).csrf, 'local-mock-csrf');
  assert.doesNotMatch(await tab.evaluate("document.querySelector('[data-subscription-summary]').textContent"), /BASIC/);
  pass('actual sandbox button double-click sends one mock checkout; 202 never grants entitlement');

  state.capabilities = 'production'; state.list = [];
  state.payment = { ...fixture, environment: 'production' };
  for (const checkout of ['created', 'ready']) {
    state.checkout = checkout; state.list = [];
    await clearIntents(); await page();
    const before = requests.filter(request => request.pathname.endsWith('/checkout')).length;
    await tab.evaluate("document.querySelector('[data-checkout-plan]').click();document.querySelector('[data-checkout-plan]').click()");
    await waitFor(async () => /sedang diverifikasi/.test(await tab.evaluate("document.querySelector('[data-form-status]').textContent")), 'production pending without URL');
    const sent = requests.filter(request => request.pathname.endsWith('/checkout'));
    assert.equal(sent.length, before + 1);
    assert.deepEqual(JSON.parse(sent.at(-1).body), { planCode: 'basic' });
    assert.ok(sent.at(-1).key); assert.equal(sent.at(-1).csrf, 'local-mock-csrf');
    assert.doesNotMatch(await tab.evaluate("document.querySelector('[data-subscription-summary]').textContent"), /BASIC/);
    pass(`production ${checkout === 'created' ? 201 : 202} without URL: one POST, pending, no entitlement`);
  }
  state.payment.redirectUrl = 'https://app-prod.duitku.com/redirect_checkout?reference=local-mock';
  state.list = [{ ...state.payment }]; await page();
  assert.equal(await tab.evaluate("document.querySelector('[data-payment-history] a').href"), state.payment.redirectUrl);
  state.payment.redirectUrl += '&returnUrl=https://evil.test'; state.list = [{ ...state.payment }];
  await page();
  assert.equal(await tab.evaluate("document.querySelector('[data-payment-history] a') === null"), true);
  assert.match(await tab.evaluate("document.querySelector('[data-payment-history]').textContent"), /tidak dapat diverifikasi/);
  pass('production history permits exact approved URL only; hostile redirect is not clickable');
  state.payment.redirectUrl = null;
  await page('/app/billing/result/?resultCode=00&merchantOrderId=KND_local_mock&reference=private&amount=1');
  assert.equal(await tab.evaluate('location.search'), '');
  assert.doesNotMatch(await tab.evaluate("document.querySelector('[data-subscription-summary]').textContent"), /BASIC/);
  const beforeProductionSubscription = requests.filter(request => request.pathname.endsWith('/subscriptions/current')).length;
  const beforeProductionCards = requests.filter(request => request.pathname.endsWith('/cards')).length;
  state.reconcile = 'paid';
  await tab.evaluate("document.querySelector('[data-reconcile-payment]').click()");
  await waitFor(async () => /Berhasil/.test(await tab.evaluate("document.querySelector('[data-payment-history]').textContent")), 'production paid mock');
  assert.match(await tab.evaluate("document.querySelector('[data-subscription-summary]').textContent"), /BASIC/);
  assert.ok(requests.filter(request => request.pathname.endsWith('/subscriptions/current')).length > beforeProductionSubscription);
  assert.ok(requests.filter(request => request.pathname.endsWith('/cards')).length > beforeProductionCards);
  await page();
  assert.equal(await tab.evaluate("document.querySelector('[data-upgrade-card=basic]').hidden"), true);
  assert.equal(await tab.evaluate("document.querySelector('[data-pro-upgrade-price]').textContent"), 'Rp55.000');
  pass('production forged return cannot activate; confirmed paid refetches entitlement and Basic-to-Pro price');

  state.payment = { ...fixture, environment: 'production' }; state.list = []; state.checkout = 'disabled';
  await clearIntents(); await page();
  const beforeClosedCheckout = requests.filter(request => request.pathname.endsWith('/checkout')).length;
  await tab.evaluate("document.querySelector('[data-checkout-plan]').click();document.querySelector('[data-checkout-plan]').click()");
  await waitFor(async () => /belum tersedia/.test(await tab.evaluate("document.querySelector('[data-form-status]').textContent")), 'production closed after capability');
  assert.equal(await tab.evaluate("[...document.querySelectorAll('[data-checkout-plan]')].every(button=>button.disabled)"), true);
  assert.equal(requests.filter(request => request.pathname.endsWith('/checkout')).length, beforeClosedCheckout + 1);
  assert.equal(await tab.evaluate("document.querySelector('[data-status-badge]').textContent"), 'Under development');
  assert.equal(await tab.evaluate("document.querySelector('.billing-notify').hidden"), false);
  pass('server closes production after enabled capabilities: one POST, no retry, locked UI restored');

  state.capabilities = 'production'; state.checkout = 'ready'; state.reconcile = 'canceled';
  await clearIntents();
  for (const [label, pending, message] of [
    ['old sandbox', { ...fixture, redirectUrl: 'https://app-sandbox.duitku.com/redirect_checkout?reference=local-mock', expiresAt: '2026-10-04T12:08:00Z' }, /Transaksi uji sebelumnya belum selesai/],
    ['unknown environment', { ...fixture, environment: null }, /konteks pembayarannya berbeda/],
    ['legacy provider', { ...fixture, provider: 'legacy', environment: 'production' }, /konteks pembayarannya berbeda/],
  ]) {
    state.payment = pending; state.list = [{ ...pending }];
    const before = requests.filter(request => request.pathname.endsWith('/checkout') || request.pathname.endsWith('/reconcile')).length;
    await page('/app/billing/?intent=basic');
    assert.equal(await tab.evaluate("[...document.querySelectorAll('[data-checkout-plan]')].every(button=>button.disabled)"), true);
    assert.match(await tab.evaluate("document.querySelector('[data-upgrade-note]').textContent"), message);
    assert.equal(await tab.evaluate("document.querySelector('[data-payment-history] a') === null"), true);
    await tab.evaluate("document.querySelector('[data-checkout-plan]').click();document.querySelector('[data-checkout-plan]').click()");
    assert.equal(requests.filter(request => request.pathname.endsWith('/checkout') || request.pathname.endsWith('/reconcile')).length, before);
    assert.equal(state.payment.status, 'pending');
    pass(`production + ${label}: explicit blocker, no new invoice/redirect or local expiry`);
  }
  state.payment = { ...fixture, redirectUrl: 'https://app-sandbox.duitku.com/redirect_checkout?reference=local-mock' };
  state.list = [{ ...state.payment }];
  await page('/app/billing/result/?merchantOrderId=KND_local_mock&resultCode=00');
  assert.match(await tab.evaluate("document.querySelector('[data-form-status]').textContent"), /Transaksi uji sebelumnya belum selesai/);
  assert.equal(await tab.evaluate('location.search'), '');
  assert.doesNotMatch(await tab.evaluate("document.querySelector('[data-subscription-summary]').textContent"), /BASIC/);
  pass('old sandbox return in production keeps conflict guidance and rejects forged success');

  const beforeResolution = requests.filter(request => request.pathname.endsWith('/checkout')).length;
  await tab.evaluate("document.querySelector('[data-reconcile-payment]').click()");
  await waitFor(async () => /Dibatalkan/.test(await tab.evaluate("document.querySelector('[data-payment-history]').textContent")), 'old sandbox canceled by mock backend');
  await page();
  assert.equal(await tab.evaluate("document.querySelector('[data-checkout-plan]').disabled"), false);
  assert.equal(requests.filter(request => request.pathname.endsWith('/checkout')).length, beforeResolution);
  pass('manual server resolution releases blocker without automatic replacement checkout');

  state.payment = { ...fixture, environment: 'production', redirectUrl: 'https://app-prod.duitku.com/redirect_checkout?reference=local-mock' };
  state.list = [{ ...state.payment }]; await page();
  assert.equal(await tab.evaluate("document.querySelector('[data-checkout-plan=basic]').disabled"), false);
  assert.equal(await tab.evaluate("document.querySelector('[data-checkout-plan=pro]').disabled"), true);
  assert.equal(await tab.evaluate("document.querySelector('[data-payment-history] a').textContent"), 'Lanjut bayar');
  pass('compatible production pending resumes existing invoice; other plan cannot create another');

  const otherId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  state.payment = { ...fixture };
  const newer = { ...fixture, publicId: otherId, merchantOrderId: 'KND_owned_new', environment: 'production' };
  state.list = [{ ...state.payment }, newer];
  await tab.evaluate(`(async()=>{const {paymentIntents}=await import('/utils/payment-intent.js');await paymentIntents.write({userPublicId:'${USER}',key:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',planCode:'basic',publicId:'${ID}'})})()`);
  await page('/app/billing/result/?merchantOrderId=KND_owned_new&resultCode=00');
  assert.equal(await tab.evaluate("[...document.querySelectorAll('[data-reconcile-payment]')].map(button=>button.dataset.reconcilePayment).join(',')"), `${otherId},${ID}`);
  assert.equal(await tab.evaluate("document.querySelector('[data-payment-history] a') === null"), true);
  assert.doesNotMatch(await tab.evaluate("document.querySelector('[data-subscription-summary]').textContent"), /BASIC/);
  pass('return with old intent selects owned matching order and preserves other pending blockers');

  state.reports = { productionRevenue: [{ currency: 'IDR', amount: '55000.00', count: 1 }, { currency: 'USD', amount: '2.50', count: 1 }],
    paymentTotals: [{ provider: 'duitku', environment: 'sandbox', status: 'paid', currency: 'IDR', amount: '97000', count: 1 },
      { provider: 'legacy', environment: null, status: 'paid', currency: 'IDR', amount: '12345', count: 1 }], revenueBasis: '<script>unsafe</script>' };
  await tab.navigate(origin + '/admin/reports/');
  await waitFor(async () => /Pendapatan bruto/.test(await tab.evaluate("document.querySelector('[data-admin-root]').textContent")), 'reports rendered');
  const productionText = await tab.evaluate("[...document.querySelectorAll('.admin-series-panel')].find(panel=>panel.textContent.startsWith('Pendapatan bruto')).textContent");
  assert.match(productionText, /IDR 55\.000,00/); assert.match(productionText, /USD 2,50/);
  assert.doesNotMatch(productionText, /97\.000|12\.345/);
  assert.match(await tab.evaluate("document.querySelector('[data-admin-root]').textContent"), /Lingkungan tidak diketahui/);
  assert.equal(await tab.evaluate("document.querySelector('[data-admin-root] script') === null"), true);
  pass('Reports render separate currencies and sandbox/unknown totals, never infer production revenue');
  for (const reports of [{}, { productionRevenue: [], paymentTotals: [] }]) {
    state.reports = reports; await tab.navigate(origin + '/admin/reports/');
    await waitFor(async () => /Pendapatan bruto/.test(await tab.evaluate("document.querySelector('[data-admin-root]').textContent")), 'old/empty reports');
    assert.match(await tab.evaluate("document.querySelector('[data-admin-root]').textContent"), /Belum ada data pada periode ini/);
    pass('Reports tolerate legacy or empty payment aggregates');
  }
  assert.deepEqual(corsTab.errors, []);
  assert.deepEqual(tab.errors, []); assert.deepEqual(second.errors, []);
  console.log(`Browser QA: ${passed} passed, 0 failed, 0 skipped; Chromium/Edge headless, LOCAL API MOCK only.`);
} finally {
  await browser?.close();
  await Promise.all([new Promise(resolve => frontend.close(resolve)), new Promise(resolve => api.close(resolve))]);
}
