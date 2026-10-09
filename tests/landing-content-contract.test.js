import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const home = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../pages/public/home.js', import.meta.url), 'utf8');
const admin = await readFile(new URL('../pages/admin/landing-content.js', import.meta.url), 'utf8');
const contact = await readFile(new URL('../contact/index.html', import.meta.url), 'utf8');

test('landing page uses typed content anchors with an API fallback-safe hydrator', () => {
  for (const key of ['heroTitle', 'moreTitle', 'socialTitle', 'plansTitle', 'securityTitle', 'finalTitle']) assert.match(home, new RegExp(`data-landing-content="${key}"`));
  assert.match(script, /api\.get\('\/public\/content\/landing'/);
  assert.match(script, /element\.textContent = value/);
  assert.doesNotMatch(script, /innerHTML|outerHTML/);
});

test('admin editor uses dedicated typed route and required audit reason', () => {
  assert.match(admin, /\/admin\/landing-content/);
  assert.match(admin, /roles\.includes\('super_admin'\)/);
  assert.match(admin, /reason\.required = true/);
  assert.match(admin, /window\.confirm/);
  assert.doesNotMatch(admin, /innerHTML|outerHTML/);
});

test('homepage shows owner-approved IDR prices, term and accurate tier descriptions without JavaScript', () => {
  const plans = Object.fromEntries([...home.matchAll(/<article[^>]*data-public-plan="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)].map(match => [match[1], match[2]]));
  assert.deepEqual(Object.keys(plans), ['starter', 'basic', 'pro']);
  assert.match(plans.starter, /Gratis[\s\S]*Rp0/);
  assert.match(plans.starter, /akun terverifikasi dan claim/);
  assert.match(plans.starter, /WhatsApp/);
  assert.match(plans.basic, /Rp55\.000[\s\S]*365 hari/);
  assert.match(plans.basic, /3 desain/);
  assert.match(plans.basic, /2 link media sosial dan 2 item katalog/);
  assert.match(plans.pro, /Rp97\.000[\s\S]*365 hari/);
  assert.match(plans.pro, /10 desain/);
  assert.match(plans.pro, /5 link media sosial dan 10 item katalog/);
  assert.match(plans.pro, /1 penerima manfaat[\s\S]*3 revisi/);
  for (const html of Object.values(plans)) assert.doesNotMatch(html, /data-landing-content/);
  assert.match(home, /Rupiah \(IDR\)/);
  assert.match(home, /Upgrade Basic → Pro: Rp55\.000/);
});

test('official merchant contacts are static, consistent and actionable on homepage and contact page', () => {
  const expectedAddress = 'Apt. Sentra Timur Residence O19 12B, Jl. Sentra Primer Timur, Cakung, Jakarta Timur. 13950, Indonesia';
  for (const html of [home, contact]) {
    const address = html.match(/<address\b[^>]*>([\s\S]*?)<\/address>/)?.[1];
    assert.ok(address);
    assert.ok(address.includes(expectedAddress));
    assert.match(address, /href="mailto:support@kartunamadigital\.id"/);
    assert.match(address, /href="tel:\+6281328219697">0813 2821 9697/);
    assert.match(address, /href="https:\/\/wa\.me\/6281328219697"/);
    assert.doesNotMatch(address, /data-landing-content|target="_blank"/);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  }
});

test('public merchant copy explains account-first billing without promising gateway availability or creating checkout', async () => {
  assert.match(home, /periksa ketersediaan pembayaran melalui Duitku di menu Langganan setelah login/);
  assert.doesNotMatch(home, /Under development|Pembayaran online belum tersedia/);
  assert.match(home, /Pendaftaran akun bukan pembelian/);
  assert.match(home, /href="\/register\/\?intent=basic">Daftar untuk Basic/);
  assert.match(home, /href="\/register\/\?intent=pro">Daftar untuk Pro/);
  assert.doesNotMatch(home, /data-checkout-plan|snapToken|duitku\.js/);
  const { PAYMENT_CHECKOUT_RELEASED } = await import('../validators/payment-validator.js');
  assert.equal(PAYMENT_CHECKOUT_RELEASED, true);
});
