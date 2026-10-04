import { api } from './api-client.js';

// Backend SMTP may wait up to 15 seconds; allow connection and response overhead.
export const STARTER_CREATE_TIMEOUT_MS = 30_000;

const recoveryId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const invalidRecovery = () => Object.assign(new Error('Recovery response cannot be verified.'), { code: 'STARTER_RECOVERY_INVALID' });
const candidate = value => recoveryId(value?.publicId) && typeof value.displayName === 'string'
  && value.displayName.length <= 300 && typeof value.slug === 'string' && /^[A-Za-z]{7}$/.test(value.slug)
  && typeof value.createdAt === 'string' && Number.isFinite(Date.parse(value.createdAt));

export const starterService = {
  create(input) {
    return api.post('/starter/cards', input, {
      csrfContext: null,
      skipRefresh: true,
      timeoutMs: STARTER_CREATE_TIMEOUT_MS,
    });
  },
  openAccess(publicId, token) {
    return api.post('/starter/access', { publicId, token }, { csrfContext: null, skipRefresh: true });
  },
  signupContext(publicId) {
    return api.get(`/starter/cards/${encodeURIComponent(publicId)}/signup-context`, { skipRefresh: true });
  },
  update(publicId, input) {
    return api.put(`/starter/cards/${encodeURIComponent(publicId)}`, input, { csrfContext: 'access' });
  },
  claim(publicId) {
    return api.post(`/starter/cards/${encodeURIComponent(publicId)}/claim`, null, { csrfContext: 'starter' });
  },
  async claimCandidates(offset = 0, options = {}) {
    if (!Number.isInteger(offset) || offset < 0 || offset > 1000) throw invalidRecovery();
    const response = await api.get(`/starter/claim-candidates?limit=20&offset=${offset}`, { signal: options.signal, includeEnvelope: true });
    const data = response?.data;
    if (response?.success !== true) throw invalidRecovery();
    if (!Array.isArray(data?.items) || data.items.length > 20 || !data.items.every(candidate)
      || data.limit !== 20 || data.offset !== offset || typeof data.hasMore !== 'boolean') throw invalidRecovery();
    return { items: data.items.map(({ publicId, displayName, slug, createdAt }) => ({ publicId, displayName, slug, createdAt })),
      limit: data.limit, offset: data.offset, hasMore: data.hasMore };
  },
  async claimCandidate(publicId, options = {}) {
    if (!recoveryId(publicId)) throw invalidRecovery();
    await api.synchronizeAccessCsrf();
    if (options.signal?.aborted) throw Object.assign(new Error('Recovery cancelled.'), { code: 'REQUEST_ABORTED' });
    const response = await api.post(`/starter/claim-candidates/${encodeURIComponent(publicId)}/claim`, { confirm: true },
      { csrfContext: 'access', forceAccessCsrf: true, skipRefresh: true, signal: options.signal, includeEnvelope: true });
    const data = response?.data;
    if (response?.success !== true) throw invalidRecovery();
    if (!candidate(data?.card) || data.card.publicId !== publicId || typeof data.alreadyOwned !== 'boolean') throw invalidRecovery();
    return { card: { publicId: data.card.publicId, displayName: data.card.displayName, slug: data.card.slug, createdAt: data.card.createdAt }, alreadyOwned: data.alreadyOwned };
  },
};
