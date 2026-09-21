import { api } from './api-client.js';

export const paymentService = {
  currentSubscription() {
    return api.get('/subscriptions/current');
  },
  listPayments() {
    return api.get('/payments');
  },
  checkout(planCode) {
    return api.post('/payments/checkout', { planCode }, { csrfContext: 'access', skipRefresh: true });
  },
  reconcile(publicId) {
    return api.post(`/payments/${encodeURIComponent(publicId)}/reconcile`, null, { csrfContext: 'access', skipRefresh: true });
  },
};
