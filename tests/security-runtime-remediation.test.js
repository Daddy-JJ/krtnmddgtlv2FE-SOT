import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PUBLIC_DIRECTORIES } from '../scripts/build-static.mjs';
import { buildApiUrl } from '../services/api-client.js';
import { publicAssetLinks } from '../services/public-card-presenter.js';
import { resumeService } from '../services/resume-service.js';
import { postLoginDestination, safeReturnTo } from '../utils/auth-flow.js';
import { validateSlug } from '../validators/slug-validator.js';
import { validateStarterInput } from '../validators/starter-validator.js';

test('returnTo accepts normalized same-origin paths and rejects slash confusion attacks', () => {
  assert.equal(safeReturnTo('/app/card/?tab=design#preview'), '/app/card/?tab=design#preview');
  for (const unsafe of [
    'https://evil.example/',
    '//evil.example/',
    '///evil.example/',
    '/\\evil.example/',
    '/%5cevil.example/',
    '/%2f%2fevil.example/',
  ]) {
    assert.equal(safeReturnTo(unsafe), '', unsafe);
  }
});

test('API request and download URLs share one configurable base builder', async () => {
  assert.equal(buildApiUrl('/cards', '/api/v1/'), '/api/v1/cards');
  assert.equal(
    buildApiUrl('/public/cards/QaStart/vcard', 'https://api.example.test/api/v1/'),
    'https://api.example.test/api/v1/public/cards/QaStart/vcard',
  );
  assert.throws(() => buildApiUrl('https://evil.example/cards'), /root-relative/);
  assert.throws(() => buildApiUrl('/cards\\escape'), /root-relative/);

  assert.deepEqual(publicAssetLinks('QaStart'), {
    vcard: '/api/v1/public/cards/QaStart/vcard',
    qrDownload: '/api/v1/public/cards/QaStart/qr?download=true',
  });
  assert.equal(
    resumeService.fileDownloadUrl('request/id', 'file/id'),
    '/api/v1/resume-requests/request%2Fid/files/file%2Fid/download',
  );

  const adminWorkspace = await readFile(
    new URL('../pages/admin/resume-request-workspace.js', import.meta.url),
    'utf8',
  );
  assert.match(adminWorkspace, /resumeService\.fileDownloadUrl\(publicId,item\.publicId\)/);
  assert.doesNotMatch(adminWorkspace, /`\/api\/v1\/resume-requests/);
});

test('Starter name length validation uses name text without website normalization', () => {
  const valid = validateStarterInput({
    contact: {
      fullName: 'A'.repeat(150),
      email: 'user@example.test',
      websiteUrl: 'https://example.test',
    },
  });
  const invalid = validateStarterInput({
    contact: {
      fullName: 'A'.repeat(151),
      email: 'user@example.test',
      websiteUrl: 'https://example.test',
    },
  });

  assert.equal(valid.fullName, undefined);
  assert.equal(invalid.fullName, 'Nama maksimal 150 karakter.');
});

test('every deployed top-level runtime directory is reserved from custom slugs', () => {
  for (const route of [...PUBLIC_DIRECTORIES, 'api']) {
    assert.equal(validateSlug(route), 'Custom URL ini termasuk reserved word.', route);
  }
});

test('post-login role routing covers every approved internal role with safe precedence', () => {
  assert.equal(postLoginDestination('super_admin'), '/admin/');
  assert.equal(postLoginDestination('resume_service_admin'), '/admin/resume-services/');
  assert.equal(
    postLoginDestination('resume_quality_reviewer'),
    '/admin/resume-services/?view=quality-review',
  );
  assert.equal(postLoginDestination('cv_specialist'), '/specialist/');
  assert.equal(postLoginDestination(['cv_specialist', 'super_admin']), '/admin/');
  assert.equal(postLoginDestination('member', { intent: 'pro' }), '/app/billing/?intent=pro');
  assert.equal(postLoginDestination('member', { intent: 'enterprise' }), '/app/');
});
