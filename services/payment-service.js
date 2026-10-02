import { api } from './api-client.js';
import { isPaymentId, validCapabilities, validatePlanCode, PAYMENT_CHECKOUT_RELEASED } from '../validators/payment-validator.js';

const invalid = () => Object.assign(new Error('Invalid payment response'), { code: 'PAYMENT_RESPONSE_INVALID' });
export function createPaymentService(client, { released = false } = {}) {
  const service = {
    async capabilities() {
      const response = await client.get('/payments/capabilities', { includeEnvelope: true });
      if (response?.success !== true || !validCapabilities(response.data)) throw invalid();
      return response.data;
    },
    currentSubscription: () => client.get('/subscriptions/current'),
    listPayments: () => client.get('/payments'),
    getPayment(publicId) {
      if (!isPaymentId(publicId)) throw invalid();
      return client.get(`/payments/${encodeURIComponent(publicId)}`);
    },
    async checkout(planCode, key) {
      if (!released) throw Object.assign(new Error('Checkout disabled'), { code: 'PAYMENT_CHECKOUT_DISABLED' });
      if (validatePlanCode(planCode) || !isPaymentId(key)) throw invalid();
      const capabilities = await service.capabilities();
      if (!capabilities.checkoutEnabled) throw Object.assign(new Error('Checkout disabled'), { code: 'PAYMENT_CHECKOUT_DISABLED' });
      await client.synchronizeAccessCsrf();
      const response = await client.post('/payments/checkout', { planCode }, {
        headers: { 'Idempotency-Key': key }, csrfContext: 'access', forceAccessCsrf: true, skipRefresh: true, includeEnvelope: true,
      });
      if (response?.success !== true || !isPaymentId(response.data?.publicId)) throw invalid();
      return response.data;
    },
    async reconcile(publicId) {
      if (!isPaymentId(publicId)) throw invalid();
      await client.synchronizeAccessCsrf();
      return client.post(`/payments/${encodeURIComponent(publicId)}/reconcile`, null, { csrfContext: 'access', forceAccessCsrf: true, skipRefresh: true });
    },
  };
  return service;
}

export const paymentService = createPaymentService(api, { released: PAYMENT_CHECKOUT_RELEASED });
