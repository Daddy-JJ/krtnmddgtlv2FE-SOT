import { api } from './api-client.js';

const adminRoot = '/admin';
const publicPath = value => encodeURIComponent(String(value ?? ''));

export class AdminOperationsService {
  constructor(client = api) { this.client = client; }

  statistics() { return this.client.get(`${adminRoot}/statistics`); }
  users() { return this.client.get(`${adminRoot}/users`); }
  user(publicId) { return this.client.get(`${adminRoot}/users/${publicPath(publicId)}`); }
  subscriptions() { return this.client.get(`${adminRoot}/subscriptions`); }
  usage() { return this.client.get(`${adminRoot}/usage`); }
  interventions() { return this.client.get(`${adminRoot}/interventions`); }
  settings() { return this.client.get(`${adminRoot}/settings`); }
  cvSpecialists() { return this.client.get(`${adminRoot}/cv-specialists`); }
  mailOutbox() { return this.client.get(`${adminRoot}/mail/outbox?limit=100`); }

  cards(search = '') {
    return this.client.get(`${adminRoot}/cards?q=${encodeURIComponent(search)}`);
  }

  card(publicId) {
    return this.client.get(`${adminRoot}/cards/${publicPath(publicId)}`);
  }

  interveneCard(publicId, input) {
    return this.client.post(`${adminRoot}/cards/${publicPath(publicId)}/interventions`, input, { csrfContext: 'access' });
  }

  interveneUser(publicId, input) {
    return this.client.post(`${adminRoot}/users/${publicPath(publicId)}/interventions`, input, { csrfContext: 'access' });
  }

  retryMail(publicId, input) {
    return this.client.post(`${adminRoot}/mail/outbox/${publicPath(publicId)}/retry`, input, { csrfContext: 'access' });
  }

  async feedback(filters = {}) {
    const query = new URLSearchParams();
    for (const key of ['page', 'limit', 'status', 'search', 'from', 'to']) {
      if (filters[key] !== undefined && filters[key] !== '') query.set(key, String(filters[key]));
    }
    const envelope = await this.client.get(`${adminRoot}/feedback?${query}`, { includeEnvelope: true });
    return {
      items: Array.isArray(envelope?.data) ? envelope.data : [],
      meta: envelope?.meta ?? { page: 1, limit: 25, total: 0, pages: 1 },
    };
  }

  updateFeedbackStatus(publicId, input) {
    return this.client.patch(`${adminRoot}/feedback/${publicPath(publicId)}/status`, input, { csrfContext: 'access' });
  }

  reports(days = 30) {
    return this.client.get(`${adminRoot}/reports?days=${encodeURIComponent(days)}`);
  }

  system() { return this.client.get(`${adminRoot}/system`); }
  security() { return this.client.get(`${adminRoot}/security`); }
}

export const adminOperationsService = new AdminOperationsService();
