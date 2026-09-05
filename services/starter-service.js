import { api } from './api-client.js';

// Backend SMTP may wait up to 15 seconds; allow connection and response overhead.
export const STARTER_CREATE_TIMEOUT_MS = 30_000;

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
  update(publicId, input) {
    return api.put(`/starter/cards/${encodeURIComponent(publicId)}`, input, { csrfContext: 'access' });
  },
  claim(publicId) {
    return api.post(`/starter/cards/${encodeURIComponent(publicId)}/claim`, null, { csrfContext: 'starter' });
  },
};
