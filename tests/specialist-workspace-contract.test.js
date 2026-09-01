import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

test('CV Specialist workspace is assignment-scoped and excludes privileged controls', async () => {
  const [login, authFlow, dashboard, request, service] = await Promise.all([
    readFile(resolve(root, 'pages/auth/login.js'), 'utf8'),
    readFile(resolve(root, 'utils/auth-flow.js'), 'utf8'),
    readFile(resolve(root, 'pages/specialist/dashboard.js'), 'utf8'),
    readFile(resolve(root, 'pages/specialist/request.js'), 'utf8'),
    readFile(resolve(root, 'services/resume-service.js'), 'utf8'),
  ]);
  assert.match(login, /postLoginDestination/);
  assert.match(authFlow, /cv_specialist[\s\S]*\/specialist\//);
  assert.match(dashboard, /roles\.includes\('cv_specialist'\)/);
  assert.match(dashboard + request, /\{ user: actor \} = await authService\.current\(\)/);
  assert.match(dashboard, /adminQueue\(\)/);
  assert.match(request, /adminDetail\(id\)/);
  assert.match(request, /fileDownloadUrl\(id, value\.publicId\)/);
  for (const field of ['whatsappNumber', 'linkedinUrl', 'pastedResumeText', 'pastedJobDescription', 'additionalAchievements', 'certifications', 'userNotes']) assert.match(request, new RegExp(field));
  assert.match(request, /registerDeliverable\(id/);
  assert.match(request, /quality review/);
  assert.doesNotMatch(dashboard + request, /resumeService\.(?:statistics|assign|release)\(/);
  assert.doesNotMatch(dashboard + request, /innerHTML|localStorage|sessionStorage/);
  assert.match(service, /files\/\$\{encodeURIComponent\(fileId\)\}\/download/);
});
