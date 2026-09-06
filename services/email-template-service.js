import { api } from './api-client.js';

const root = '/admin/mail/templates';
const pathFor = (key, suffix = '') => `${root}/${encodeURIComponent(key)}${suffix}`;

export function createIdempotencyKey(cryptoSource = globalThis.crypto) {
  if (typeof cryptoSource?.randomUUID === 'function') return cryptoSource.randomUUID();
  if (typeof cryptoSource?.getRandomValues !== 'function') {
    throw new Error('Browser tidak mendukung idempotency key yang aman.');
  }
  const bytes = cryptoSource.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

const sensitiveOptions = idempotencyKey => ({
  headers: { 'Idempotency-Key': idempotencyKey },
  skipRefresh: true,
});

export class EmailTemplateService {
  constructor(client = api) { this.client = client; }
  list() { return this.client.get(root); }
  detail(key) { return this.client.get(pathFor(key)); }
  saveDraft(key, expectedRevision, content) {
    return this.client.put(pathFor(key, '/draft'), { expectedRevision, content });
  }
  preview(key, draftRevision) {
    return this.client.post(pathFor(key, '/preview'), { draftRevision });
  }
  testSend(key, draftRevision, idempotencyKey = createIdempotencyKey()) {
    return this.client.post(pathFor(key, '/test-send'), { draftRevision, confirm: true }, sensitiveOptions(idempotencyKey));
  }
  testStatus(key, testId) {
    return this.client.get(pathFor(key, `/test-sends/${encodeURIComponent(testId)}`));
  }
  publish(key, input, idempotencyKey = createIdempotencyKey()) {
    return this.client.post(pathFor(key, '/publish'), { ...input, confirm: true }, sensitiveOptions(idempotencyKey));
  }
  versions(key, { limit = 20, cursor = null } = {}) {
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor != null) query.set('cursor', String(cursor));
    return this.client.get(pathFor(key, `/versions?${query}`));
  }
  version(key, version) {
    return this.client.get(pathFor(key, `/versions/${encodeURIComponent(version)}`));
  }
  restore(key, input, idempotencyKey = createIdempotencyKey()) {
    return this.client.post(pathFor(key, '/restore'), { ...input, confirm: true }, sensitiveOptions(idempotencyKey));
  }
}

export const emailTemplateService = new EmailTemplateService();
