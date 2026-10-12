import { api } from './api-client.js';
import { ApiError } from './api-error.js';

export const contentService = {
  listSocial(cardId, options) {
    return api.get(`/cards/${encodeURIComponent(cardId)}/social-links`, options);
  },
  async createSocial(cardId, input, { signal } = {}) {
    await api.synchronizeAccessCsrf();
    if (signal?.aborted) throw new ApiError({ code: 'REQUEST_ABORTED', message: 'Request cancelled.' });
    return api.post(`/cards/${encodeURIComponent(cardId)}/social-links`, input, { csrfContext: 'access', forceAccessCsrf: true, skipRefresh: true, signal });
  },
  deleteSocial(cardId, linkId, { signal } = {}) {
    return api.delete(`/cards/${encodeURIComponent(cardId)}/social-links/${encodeURIComponent(linkId)}`, { csrfContext: 'access', signal });
  },
  listCatalog(cardId, options) {
    return api.get(`/cards/${encodeURIComponent(cardId)}/catalog-items`, options);
  },
  async createCatalog(cardId, input, { signal } = {}) {
    await api.synchronizeAccessCsrf();
    if (signal?.aborted) throw new ApiError({ code: 'REQUEST_ABORTED', message: 'Request cancelled.' });
    return api.post(`/cards/${encodeURIComponent(cardId)}/catalog-items`, input, { csrfContext: 'access', forceAccessCsrf: true, skipRefresh: true, signal });
  },
  deleteCatalog(cardId, itemId, { signal } = {}) {
    return api.delete(`/cards/${encodeURIComponent(cardId)}/catalog-items/${encodeURIComponent(itemId)}`, { csrfContext: 'access', signal });
  },
};
