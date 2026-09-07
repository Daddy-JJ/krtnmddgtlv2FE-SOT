import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiClient } from '../services/api-client.js';
import { billingStatusLabel, validatePlanCode } from '../validators/payment-validator.js';
import{readFile}from'node:fs/promises';

test('billing reads omit CSRF while checkout and reconcile use access CSRF', async () => {
  const requests = [];
  const client = new ApiClient({
    baseUrl: 'https://example.test/api/v1',
    cookieSource: () => 'csrf_token=access-csrf; starter_csrf_token=starter-csrf',
    fetchImpl: async (url, options) => {
      requests.push({ url, method: options.method, csrf: options.headers.get('x-csrf-token'), body: options.body ? JSON.parse(options.body) : null });
      const data = url.endsWith('/payments/checkout') ? { publicId: 'payment-1', snapToken: 'snap-token', redirectUrl: 'https://pay.example' } : [];
      return new Response(JSON.stringify({ success: true, data }), { status: url.endsWith('/payments/checkout') ? 201 : 200 });
    },
  });

  await client.get('/subscriptions/current');
  await client.get('/payments');
  await client.post('/payments/checkout', { planCode: 'basic' }, { csrfContext: 'access' });
  await client.post('/payments/payment-1/reconcile', null, { csrfContext: 'access' });

  assert.deepEqual(requests.map((request) => request.csrf), [null, null, 'access-csrf', 'access-csrf']);
  assert.equal(requests[2].body.planCode, 'basic');
});

test('billing validator locks checkout plans and status labels', () => {
  assert.equal(validatePlanCode('basic'), '');
  assert.equal(validatePlanCode('pro'), '');
  assert.equal(validatePlanCode('starter'), 'Pilih paket Basic atau Pro.');
  assert.equal(billingStatusLabel('paid'), 'Berhasil');
  assert.equal(billingStatusLabel('pending'), 'Menunggu');
});

test('billing UI keeps annual plans visible but locks checkout while payment is unavailable',async()=>{
  const [html,source]=await Promise.all([
    readFile(new URL('../app/billing/index.html',import.meta.url),'utf8'),
    readFile(new URL('../pages/app/billing.js',import.meta.url),'utf8'),
  ]);
  assert.match(html,/Basic Tahunan/);
  assert.match(html,/Pro Tahunan/);
  assert.match(html,/Rp55\.000/);
  assert.match(html,/Rp97\.000/);
  assert.match(html,/Under development/);
  assert.doesNotMatch(html+source,/Segera hadir|Belum dibuka|sedang dalam persiapan/i);
  assert.match(html,/data-checkout-plan="basic" disabled/);
  assert.match(html,/data-checkout-plan="pro" disabled/);
  assert.match(html,/data-notify-form/);
  assert.match(html,/dashboard-panel billing-plan billing-plan--locked/);
  assert.match(html,/dashboard-panel billing-notify/);
  assert.match(html,/billing-plan__badge" data-status-badge/);
  assert.match(html,/billing-plan__cta primary-cta/);
  assert.match(html,/365 hari/g);
  assert.doesNotMatch(source,/paymentService\.checkout|function checkout|toggleCheckout/);
  assert.match(source, /Peningkatan membership masih Under development\./);
  assert.match(source, /clearStatus\(status\)/);
  assert.doesNotMatch(source, /Tagihan siap\./);
  assert.doesNotMatch(html,/one-time|sekali bayar/i);
});

test('billing user copy does not expose implementation details', async () => {
  const source = await readFile(new URL('../pages/app/billing.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /status dari backend|backend melaporkan|backend memverifikasi/i);
});
