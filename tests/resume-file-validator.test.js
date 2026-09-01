import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_RESUME_DOCX_BYTES, validateResumeSourceDocx } from '../validators/resume-file-validator.js';

test('Resume DOCX rule has one reusable 10 MB frontend validator', () => {
  assert.equal(MAX_RESUME_DOCX_BYTES, 10 * 1024 * 1024);
  assert.equal(validateResumeSourceDocx(null), 'Pilih file CV .docx terlebih dahulu.');
  assert.equal(validateResumeSourceDocx({ name: 'resume.pdf', size: 100 }), 'CV sumber wajib menggunakan format .docx.');
  assert.equal(validateResumeSourceDocx({ name: 'resume.docx', size: MAX_RESUME_DOCX_BYTES + 1 }), 'Ukuran file melebihi batas maksimum 10 MB.');
  assert.equal(validateResumeSourceDocx({ name: 'resume.docx', size: MAX_RESUME_DOCX_BYTES }), '');
});
