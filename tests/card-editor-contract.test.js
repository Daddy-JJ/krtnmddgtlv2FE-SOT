import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiClient } from '../services/api-client.js';
import { buildCardInput, validateCardInput } from '../validators/card-validator.js';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { apiErrorMessage } from '../utils/api-error-message.js';

const serviceSource = await readFile(new URL('../services/card-service.js', import.meta.url), 'utf8');
const editorSource = await readFile(new URL('../pages/app/card-editor.js', import.meta.url), 'utf8');
const savedCard = { publicId: 'owned-card', contact: { fullName: 'Nama User' } };

function serviceFor(client) {
  return runInNewContext(serviceSource.replace(/^import .*;\r?$/gm, '').replace('export const cardService', 'const cardService') + '\ncardService;', { api: client });
}

for (const action of ['create', 'update']) {
  test(`card ${action} uses freshly synchronized CSRF instead of stale readable cookie`, async () => {
    const calls = [];
    const client = new ApiClient({ baseUrl: 'https://example.test/api/v1', cookieSource: () => 'csrf_token=stale', fetchImpl: async (url, options) => {
      calls.push({ path: new URL(url).pathname, method: options.method, token: options.headers.get('x-csrf-token'), credentials: options.credentials });
      return Response.json({ success: true, data: url.endsWith('/auth/csrf') ? { csrfToken: 'fresh' } : savedCard });
    } });
    const service = serviceFor(client);
    await (action === 'create' ? service.create({ contact: {} }) : service.update('owned-card', { contact: {} }));
    assert.deepEqual(calls, [
      { path: '/api/v1/auth/csrf', method: 'GET', token: null, credentials: 'include' },
      { path: action === 'create' ? '/api/v1/cards' : '/api/v1/cards/owned-card', method: action === 'create' ? 'POST' : 'PUT', token: 'fresh', credentials: 'include' },
    ]);
  });
}

test('CSRF synchronization failure prevents card mutation entirely', async () => {
  const calls = [];
  const client = new ApiClient({ baseUrl: 'https://example.test/api/v1', fetchImpl: async url => {
    calls.push(url); return Response.json({ success: false, code: 'AUTH_REQUIRED' }, { status: 401 });
  } });
  await assert.rejects(serviceFor(client).create({ contact: {} }));
  assert.equal(calls.some(url => url.endsWith('/cards')), false);
});

for (const failure of ['CSRF_INVALID', 'REQUEST_TIMEOUT', 'NETWORK_ERROR', 'HTTP_ERROR']) {
  test(`first-card ${failure} never replays POST or refreshes the session`, async () => {
    const calls = [];
    const client = new ApiClient({ baseUrl: 'https://example.test/api/v1', timeoutMs: 20, fetchImpl: async (url, options) => {
      calls.push([url, options.method]);
      if (url.endsWith('/auth/csrf')) return Response.json({ success: true, data: { csrfToken: 'fresh' } });
      if (failure === 'NETWORK_ERROR') throw new TypeError('offline');
      if (failure === 'REQUEST_TIMEOUT') return new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted mock request')), { once: true });
      });
      return Response.json({ success: false, code: failure }, { status: failure === 'CSRF_INVALID' ? 403 : 500 });
    } });
    await assert.rejects(serviceFor(client).create({ contact: {} }), { code: failure });
    assert.equal(calls.filter(([url]) => url.endsWith('/cards')).length, 1);
    assert.equal(calls.some(([url]) => url.endsWith('/auth/refresh')), false);
  });
}

async function editorHarness(overrides = {}) {
  const messages = [], calls = [];
  const fields = new Map();
  const submit = { disabled: false };
  const starterMessage = { textContent: '' };
  const starterNextStep = { hidden: true, querySelector: () => starterMessage };
  const form = { dataset: {}, elements: new Proxy({}, { get: (_target, field) => {
    if (!fields.has(field)) fields.set(field, { value: '' }); return fields.get(field);
  } }), addEventListener() {}, setAttribute() {}, removeAttribute() {}, querySelectorAll: () => [submit] };
  const service = { list: async () => [], get: async () => savedCard,
    create: async () => { calls.push('create'); return savedCard; },
    update: async () => { calls.push('update'); return savedCard; }, ...overrides };
  const context = { cardService: service, paymentService: { currentSubscription: overrides.currentSubscription ?? (async () => ({ planCode: 'basic', status: 'active', startsAt: '2020-01-01T00:00:00Z', endsAt: '2099-01-01T00:00:00Z' })) }, apiErrorMessage, formValues: () => ({ firstName: 'Nama User' }),
    buildCardInput: values => ({ contact: { fullName: values.firstName } }), validateCardInput: () => ({}),
    clearFieldErrors() {}, showFieldErrors() {}, mapApiFieldErrors: () => ({}), bindWebsiteUrlInput() {},
    splitName: () => ({ firstName: 'Nama', lastName: 'User' }),
    setBusy: (_form, value) => { submit.disabled = value; }, showStatus: (_node, message) => messages.push(message),
    document: { querySelector: selector => selector === '[data-card-editor-form]' ? form : selector === '[data-starter-next-step]' ? starterNextStep : selector === '[data-form-status]' ? {} : null,
      documentElement: { lang: 'id' }, dispatchEvent() {} },
    location: { assign() {}, origin: 'https://example.test' }, CustomEvent: class {},
  };
  const controller = runInNewContext(editorSource.replace(/^import .*;\r?$/gm, '') + '\n({save, state});', context);
  await new Promise(resolve => setImmediate(resolve));
  return { controller, calls, messages, submit, service, starterNextStep, starterMessage, event: { preventDefault() {} } };
}

for (const subscription of [null, { planCode: 'basic', status: 'expired', startsAt: '2020-01-01', endsAt: '2021-01-01' }, { planCode: 'pro', status: 'active', startsAt: '2020-01-01', endsAt: '2021-01-01' }]) {
  test(`empty account without active paid plan offers Starter, never attempts create: ${JSON.stringify(subscription)}`, async () => {
    const h = await editorHarness({ currentSubscription: async () => subscription });
    assert.equal(h.controller.state.mode, 'starter_required');
    assert.equal(h.starterNextStep.hidden, false); assert.equal(h.submit.disabled, true);
    await h.controller.save(h.event); assert.deepEqual(h.calls, []);
    assert.match(h.starterMessage.textContent, /Starter gratis/);
  });
}

test('subscription 404 offers Starter; errors/malformed subscriptions fail closed without claiming no entitlement', async () => {
  const absent = await editorHarness({ currentSubscription: async () => { throw { status: 404 }; } });
  assert.equal(absent.controller.state.mode, 'starter_required');
  for (const read of [async () => { throw { status: 503 }; }, async () => ({}), async () => ({ planCode: 'basic' }), async () => ({ planCode: 'basic', status: 'active', startsAt: 0, endsAt: 4102444800000 })]) {
    const h = await editorHarness({ currentSubscription: read });
    assert.equal(h.controller.state.mode, 'load_failed'); assert.equal(h.starterNextStep.hidden, true);
    await h.controller.save(h.event); assert.deepEqual(h.calls, []);
  }
});

test('claimed Starter edit does not require a paid subscription', async () => {
  const h = await editorHarness({ list: async () => [{ publicId: savedCard.publicId }], get: async () => ({ ...savedCard, planCode: 'starter' }),
    currentSubscription: async () => assert.fail('Starter editing must not be gated by paid subscription') });
  assert.equal(h.controller.state.mode, 'ready'); assert.equal(h.starterNextStep.hidden, true);
  await h.controller.save(h.event); assert.deepEqual(h.calls, ['update']);
});

test('entitlement denied during save shows CTA, preserves form and never retries or redirects', async () => {
  let posts = 0;
  const h = await editorHarness({ create: async () => { posts += 1; throw { status: 403, code: 'PAID_ENTITLEMENT_REQUIRED' }; } });
  await h.controller.save(h.event); await h.controller.save(h.event);
  assert.equal(posts, 1); assert.equal(h.starterNextStep.hidden, false);
  assert.equal(h.submit.disabled, true); assert.equal(h.controller.state.submitting, false);
});

test('Starter CTA is a keyboard-accessible existing route with no intent-based entitlement or automatic redirect', async () => {
  const html = await readFile(new URL('../app/card/identity/index.html', import.meta.url), 'utf8');
  assert.match(html, /href="\/create\/" aria-describedby="starterNextStepHint">Mulai dengan Starter/);
  assert.match(html, /salin data sebelum melanjutkan/);
  assert.doesNotMatch(editorSource, /location\.(?:assign|replace)\(['"]\/create/);
  assert.doesNotMatch(editorSource, /URLSearchParams.*intent/);
});

test('first-card concurrent submit/Enter uses one create, then later save uses update', async () => {
  let resolveCreate;
  let creates = 0;
  const h = await editorHarness({ create: () => { creates += 1; return new Promise(resolve => { resolveCreate = resolve; }); } });
  const first = h.controller.save(h.event);
  assert.equal(h.submit.disabled, true);
  await h.controller.save(h.event); await h.controller.save(h.event);
  assert.equal(creates, 1);
  resolveCreate(savedCard); await first;
  assert.equal(h.submit.disabled, false);
  await h.controller.save(h.event);
  assert.deepEqual(h.calls, ['update']);
});

for (const list of [null, {}, { items: [] }, [null], [{}], [{ publicId: '' }]]) {
  test(`malformed card list cannot enter create mode: ${JSON.stringify(list)}`, async () => {
    const h = await editorHarness({ list: async () => list });
    assert.equal(h.controller.state.mode, 'load_failed');
    assert.equal(h.submit.disabled, true);
    await h.controller.save(h.event); assert.deepEqual(h.calls, []);
  });
}

test('invalid owned detail does not fall back to creation', async () => {
  const h = await editorHarness({ list: async () => [{ publicId: 'owned-card' }], get: async () => null });
  assert.equal(h.controller.state.mode, 'load_failed');
  await h.controller.save(h.event); assert.deepEqual(h.calls, []);
});

test('CSRF error keeps user input and releases in-flight guard for an explicit later attempt', async () => {
  const h = await editorHarness({ create: async () => { throw { status: 403, code: 'CSRF_INVALID' }; } });
  await h.controller.save(h.event);
  assert.equal(h.controller.state.mode, 'empty');
  assert.equal(h.controller.state.submitting, false);
  assert.equal(h.submit.disabled, false);
  assert.match(h.messages.at(-1), /Sesi keamanan/);
});

for (const failure of [{ code: 'REQUEST_TIMEOUT' }, { code: 'NETWORK_ERROR' }, { status: 500 }, { malformed: true }]) {
  test(`ambiguous first-card save requires reload before another create: ${JSON.stringify(failure)}`, async () => {
    let creates = 0;
    const h = await editorHarness({ create: async () => { creates += 1; if (failure.malformed) return null; throw failure; } });
    await h.controller.save(h.event); await h.controller.save(h.event);
    assert.equal(creates, 1); assert.equal(h.controller.state.mode, 'save_unknown');
    assert.equal(h.controller.state.submitting, false); assert.equal(h.submit.disabled, true);
  });
}

test('card update uses access CSRF and preserves a complete contact payload', async () => {
  let observed;
  const client = new ApiClient({
    baseUrl: 'https://example.test/api/v1',
    cookieSource: () => 'csrf_token=access-csrf; starter_csrf_token=starter-csrf',
    fetchImpl: async (_url, options) => {
      observed = {
        csrf: options.headers.get('x-csrf-token'),
        body: JSON.parse(options.body),
      };
      return new Response(JSON.stringify({ success: true, data: { publicId: 'card-1' } }), { status: 200 });
    },
  });
  const currentCard = {
    publicId: 'card-1',
    locale: 'id',
    contact: {
      fullName: 'Nama Lama',
      jobTitle: 'Owner',
      organization: 'KND',
      officePhone: '021',
      mobilePhone: '08123',
      email: 'old@example.com',
      websiteUrl: 'https://old.example',
      addressText: 'Jakarta',
      mapsUrl: null,
    },
  };

  const input = buildCardInput({ fullName: 'Nama Baru' }, currentCard);
  await client.put('/cards/card-1', input, { csrfContext: 'access' });

  assert.equal(observed.csrf, 'access-csrf');
  assert.equal(observed.body.contact.fullName, 'Nama Baru');
  assert.equal(observed.body.contact.email, 'old@example.com');
  assert.equal(observed.body.contact.mapsUrl, null);
});

test('card editor validator can scope field errors to the active page section', () => {
  const currentCard = {
    locale: 'id',
    contact: {
      fullName: 'Nama',
      jobTitle: '',
      organization: '',
      officePhone: '',
      mobilePhone: '',
      email: 'bad',
      websiteUrl: 'ftp://bad.test',
      addressText: '',
      mapsUrl: null,
    },
  };
  const input = buildCardInput({}, currentCard);

  assert.deepEqual(validateCardInput(input, ['fullName', 'jobTitle', 'organization']), {});
  assert.equal(validateCardInput(input, ['email', 'websiteUrl']).email, 'Format email belum valid.');
});

test('card editor composes structured name and address fields into the legacy API contact contract', () => {
  const input = buildCardInput({
    firstName: 'Bapak',
    lastName: 'Phoenikz',
    addressStreet: 'RT 03 RW 02 Jalan Kabupaten',
    addressCity: 'Bandung',
    addressProvince: 'Jawa Barat',
    addressPostalCode: '40115',
    addressCountry: 'Indonesia',
  }, { locale: 'id', contact: { jobTitle: '', organization: '', officePhone: '', mobilePhone: '', email: 'a@example.com', websiteUrl: 'https://example.com', addressText: '' } });
  assert.equal(input.contact.fullName, 'Bapak Phoenikz');
  assert.equal(input.contact.addressText, 'RT 03 RW 02 Jalan Kabupaten\nBandung\nJawa Barat\n40115\nIndonesia');
});

test('card editor preserves prefix and separates first and optional last names', () => {
  const input = buildCardInput({ namePrefix: 'Mr', firstName: 'Arwan', lastName: 'Prabowo' }, { locale: 'id', contact: { fullName: 'Old', jobTitle: '', organization: '', officePhone: '', mobilePhone: '', email: 'a@example.com', websiteUrl: '', addressText: '' } });
  assert.equal(input.contact.fullName, 'Mr Arwan Prabowo');
  const oneWord = buildCardInput({ namePrefix: 'Ms', firstName: 'Sari', lastName: '' }, { locale: 'id', contact: { fullName: 'Old', jobTitle: '', organization: '', officePhone: '', mobilePhone: '', email: 'a@example.com', websiteUrl: '', addressText: '' } });
  assert.equal(oneWord.contact.fullName, 'Ms Sari');
});

test('card editor accepts a nullable HTTP(S) Maps URL without dropping other contact data', () => {
  const currentCard = {
    locale: 'id',
    contact: {
      fullName: 'Bapak Phoenikz',
      jobTitle: '',
      organization: '',
      officePhone: '',
      mobilePhone: '08123',
      email: 'a@example.com',
      websiteUrl: 'https://example.com',
      addressText: 'Bandung',
      mapsUrl: 'https://maps.google.com/old',
    },
  };
  const input = buildCardInput({ mapsUrl: 'https://maps.google.com/new' }, currentCard);
  assert.equal(input.contact.mapsUrl, 'https://maps.google.com/new');
  assert.equal(input.contact.mobilePhone, '08123');
  assert.deepEqual(validateCardInput(input, ['mapsUrl']), {});

  const cleared = buildCardInput({ mapsUrl: '' }, currentCard);
  assert.equal(cleared.contact.mapsUrl, null);
  const invalid = buildCardInput({ mapsUrl: 'javascript:alert(1)' }, currentCard);
  assert.equal(validateCardInput(invalid, ['mapsUrl']).mapsUrl, 'Link Google Maps wajib memakai URL http atau https.');
});
