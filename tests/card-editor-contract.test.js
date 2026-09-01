import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiClient } from '../services/api-client.js';
import { buildCardInput, validateCardInput } from '../validators/card-validator.js';

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
