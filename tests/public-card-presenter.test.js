import assert from 'node:assert/strict';
import test from 'node:test';
import { publicAssetLinks, publicCardViewModel, publicSlugFromPath, whatsappChatUrl } from '../services/public-card-presenter.js';

test('root public slug parser preserves Starter case and rejects nested or unsafe paths', () => {
  assert.equal(publicSlugFromPath('/QaStart'), 'QaStart');
  assert.equal(publicSlugFromPath('/qa-basic/'), 'qa-basic');
  assert.equal(publicSlugFromPath('/api/v1/public/cards/QaStart'), null);
  assert.equal(publicSlugFromPath('/ab'), null);
  assert.equal(publicSlugFromPath('/-invalid'), null);
  assert.equal(publicSlugFromPath('/invalid-'), null);
  assert.equal(publicSlugFromPath('/bad%2Fslug'), null);
  assert.equal(publicSlugFromPath('/%E0%A4%A'), null);
});

test('public aggregate maps normalized contact data to the shared theme contract', () => {
  const view = publicCardViewModel({
    contact: {
      fullName: 'QA Basic',
      jobTitle: 'Quality Assurance',
      organization: 'KartuNamaDigital.id',
      mobilePhone: '+6281200000000',
      email: 'qa.basic@example.test',
    },
    canonicalUrl: 'https://kartunamadigital.id/qa-basic',
    qrImageUrl: '/api/v1/public/cards/qa-basic/qr',
    logoUrl: null,
    socialLinks: [{ platform: 'linkedin', url: 'https://example.test/qa' }],
  });

  assert.equal(view.fullName, 'QA Basic');
  assert.equal(view.mobilePhone, '+6281200000000');
  assert.equal(view.qrUrl, '/api/v1/public/cards/qa-basic/qr');
  assert.equal(view.canonicalUrl, 'https://kartunamadigital.id/qa-basic');
  assert.equal(view.logoUrl, '');
  assert.equal(view.socialLinks.length, 1);
});

test('public VCF and QR links encode the exact case-sensitive slug', () => {
  assert.deepEqual(publicAssetLinks('QaStart'), {
    vcard: '/api/v1/public/cards/QaStart/vcard',
    qrDownload: '/api/v1/public/cards/QaStart/qr?download=true',
  });
});

test('WhatsApp shortlink normalizes Indonesian mobile numbers for every tier', () => {
  assert.equal(whatsappChatUrl('0813 2821-9697'), 'https://wa.me/6281328219697');
  assert.equal(whatsappChatUrl('+62 813 2821 9697'), 'https://wa.me/6281328219697');
  assert.equal(whatsappChatUrl('6281328219697'), 'https://wa.me/6281328219697');
  assert.equal(whatsappChatUrl('81328219697'), 'https://wa.me/6281328219697');
  assert.equal(whatsappChatUrl('021-555-0100'), '');
  assert.equal(whatsappChatUrl('0813ext123'), '');
  assert.equal(whatsappChatUrl(''), '');
});
