import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildCardInput, validateCardInput } from '../validators/card-validator.js';
import { buildResumeRequestInput, validateResumeRequestInput } from '../validators/resume-request-validator.js';
import { validateResumeDocx } from '../validators/resume-file-validator.js';

const root = new URL('../', import.meta.url);
const source = path => readFile(new URL(path, root), 'utf8');

test('card editor preserves full contract validation and maps composite errors to visible fields', async () => {
  const input = buildCardInput({
    firstName: 'A'.repeat(151),
    addressStreet: 'B'.repeat(1001),
  }, { locale: 'id', contact: { fullName: '', addressText: '', email: '', websiteUrl: '' } });
  const errors = validateCardInput(input);
  assert.ok(errors.fullName);
  assert.ok(errors.addressText);
  const editor = await source('pages/app/card-editor.js');
  assert.match(editor, /errors\.firstName = errors\.fullName/);
  assert.match(editor, /errors\.addressStreet = errors\.addressText/);
});

test('Resume request validation trims input, keeps documented limits, and requires consent', () => {
  const input = buildResumeRequestInput({
    beneficiaryName: '  Sari  ',
    whatsappNumber: '+62 812 3456',
    currentJobTitle: 'Engineer',
    currentOrganization: '',
    experienceYears: '4.5',
    careerLevel: 'Staff',
    targetRole: 'Lead Engineer',
    targetIndustry: 'Technology',
    targetCompany: '',
    targetCountry: 'Indonesia',
    resumeLanguage: 'Indonesian',
    resumeStyle: 'ATS-Friendly',
    linkedinUrl: '',
    pastedResumeText: 'A'.repeat(30_000),
    pastedJobDescription: '',
    additionalAchievements: '',
    certifications: '',
    combinedConsent: 'on',
  });
  assert.equal(input.beneficiaryName, 'Sari');
  assert.equal(input.currentOrganization, null);
  assert.equal(input.experienceYears, 4.5);
  assert.deepEqual(validateResumeRequestInput(input), {});
  input.consents.retention = false;
  assert.ok(validateResumeRequestInput(input).combinedConsent);
});

test('all Resume operational uploads use the shared DOCX rule and one mutation guard', async () => {
  assert.equal(validateResumeDocx({ name: 'candidate.pdf', size: 100 }, { label: 'Dokumen kerja' }), 'Dokumen kerja wajib menggunakan format .docx.');
  const [admin, specialist] = await Promise.all([
    source('pages/admin/resume-request-workspace.js'),
    source('pages/specialist/request.js'),
  ]);
  for (const script of [admin, specialist]) {
    assert.match(script, /validateResumeDocx/);
    assert.match(script, /mutationPending/);
    assert.match(script, /setWorkspaceBusy\(true\)/);
    assert.match(script, /reason\.length\s*<\s*10/);
  }
});

test('API-provided navigation and image targets are normalized before DOM assignment', async () => {
  const [starter, settings, billing] = await Promise.all([
    source('pages/starter/create.js'),
    source('pages/app/card-settings.js'),
    source('pages/app/billing.js'),
  ]);
  assert.match(starter, /safeHttpUrl\(card\.canonicalUrl\)/);
  assert.doesNotMatch(starter, /resultUrl\.href = card\.canonicalUrl/);
  assert.match(settings, /safeImageUrl\(card\.qrImageUrl\)/);
  assert.match(settings, /safeHttpUrl\(card\.canonicalUrl\)/);
  assert.doesNotMatch(settings, /\.href = card\.canonicalUrl|\.src = card\.qrImageUrl/);
  assert.match(billing, /safeHttpUrl\(payment\.redirectUrl\)/);
  assert.doesNotMatch(billing, /pay\.href = payment\.redirectUrl/);
});

test('async retry, admin search, and Resume detail expose guarded states', async () => {
  const [login, admin, detail, detailShell] = await Promise.all([
    source('pages/auth/login.js'),
    source('pages/admin/super-admin-workspace.js'),
    source('pages/app/resume-enhancement-detail.js'),
    source('app/resume-enhancement/request/index.html'),
  ]);
  assert.match(login, /if \(claimPending\) return/);
  assert.match(admin, /searchSequence/);
  assert.match(admin, /submit\.disabled=true/);
  assert.match(detail, /Detail tidak dapat dimuat/);
  assert.match(detail, /nodes\.retry\.hidden = false/);
  assert.match(detailShell, /data-retry hidden/);
});
