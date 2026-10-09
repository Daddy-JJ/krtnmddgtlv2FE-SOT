import { isPaymentId, validatePlanCode, paymentCheckoutAllowed, pendingPaymentIssue, pendingCheckoutIssue } from '../validators/payment-validator.js';
import { paymentSessionVersion } from '../utils/payment-intent.js';

const failure = code => Object.assign(new Error(code), { code });
export function createPaymentFlow({ service, intents, userPublicId, currentUser, cards,
  lock = (name, task) => globalThis.navigator?.locks?.request(name, task),
  uuid = () => crypto.randomUUID(), now = () => Date.now(), cooldownSeconds = 30,
  version = paymentSessionVersion }) {
  let busy = false;
  const initialVersion = version();
  const deadlines = new Map();
  const rateLimitDelay = error => Math.max(30,
    Number.isSafeInteger(cooldownSeconds) && cooldownSeconds >= 30 ? cooldownSeconds : 30,
    Number.isSafeInteger(error.retryAfterSeconds) && error.retryAfterSeconds >= 0 ? error.retryAfterSeconds : 0);
  const remaining = id => Math.max(0, Math.ceil(((deadlines.get(id) || 0) - now()) / 1000));
  async function assertUser() {
    if (version() !== initialVersion || (await currentUser()) !== userPublicId) {
      await intents.clear(userPublicId); throw failure('AUTH_REQUIRED');
    }
  }
  async function ownedPayment(id) {
    if (!isPaymentId(id)) throw failure('PAYMENT_RESPONSE_INVALID');
    const payment = await service.getPayment(id);
    if (payment?.publicId !== id) throw failure('PAYMENT_RESPONSE_INVALID');
    await assertUser();
    return payment;
  }
  async function lockOperation(task) {
    const operation = lock(`knd-payment-${userPublicId}`, task);
    if (!operation) throw failure('PAYMENT_COORDINATION_UNAVAILABLE');
    return operation;
  }
  return {
    remaining,
    setCooldown(seconds) { if (Number.isInteger(seconds) && seconds >= 30) cooldownSeconds = seconds; },
    async purchase(planCode) {
      if (busy || remaining('checkout')) return null;
      if (validatePlanCode(planCode)) throw failure('VALIDATION_ERROR');
      busy = true; // Before the first await, including lock acquisition.
      try {
        return await lockOperation(async () => {
          await assertUser();
          await intents.ensureShared?.();
          const capabilities = await service.capabilities();
          await assertUser();
          if (!paymentCheckoutAllowed(capabilities)) throw failure('PAYMENT_CHECKOUT_DISABLED');
          const history = await service.listPayments();
          if (!Array.isArray(history)) throw failure('PAYMENT_RESPONSE_INVALID');
          let intent = await intents.read(userPublicId);
          await assertUser();
          const pending = history.find(payment => payment.status === 'pending');
          if (pending) {
            const issue = pendingCheckoutIssue(history, capabilities, planCode);
            if (issue) throw failure(issue);
            const existing = await ownedPayment(pending.publicId);
            const detailIssue = pendingPaymentIssue(existing, capabilities, planCode);
            if (detailIssue) throw failure(detailIssue);
            // Reading an existing invoice is not evidence that it belongs to this key.
            return existing;
          }
          if (intent?.publicId) {
            const previous = await ownedPayment(intent.publicId);
            if (!['paid', 'failed', 'expired', 'canceled', 'refunded', 'refund_pending_review'].includes(previous.status)) {
              const issue = pendingPaymentIssue(previous, capabilities, planCode);
              if (issue) throw failure(issue);
              return previous;
            }
            await intents.clear(); intent = null;
          }
          if (intent && intent.planCode !== planCode) throw failure('IDEMPOTENCY_CONFLICT');
          if (!intent) intent = { userPublicId, planCode, key: uuid(), publicId: null };
          await intents.write(intent);
          await assertUser();
          try {
            const payment = await service.checkout(planCode, intent.key);
            await assertUser();
            await intents.write({ ...intent, publicId: payment.publicId });
            await assertUser();
            return payment;
          } catch (error) {
            if (error.code === 'CHECKOUT_PENDING_EXISTS' && isPaymentId(error.details?.publicId)) {
              const existing = await ownedPayment(error.details.publicId);
              throw failure(pendingPaymentIssue(existing, capabilities, planCode) || 'CHECKOUT_PENDING_EXISTS');
            }
            throw error;
          }
        });
      } catch (error) {
        if (error.status === 429) deadlines.set('checkout', now() + rateLimitDelay(error) * 1000);
        throw error;
      } finally { busy = false; }
    },
    async reconcile(id) {
      if (busy || remaining(id)) return null;
      if (!isPaymentId(id)) throw failure('PAYMENT_RESPONSE_INVALID');
      busy = true;
      deadlines.set(id, now() + Math.max(30, cooldownSeconds) * 1000);
      try {
        await assertUser();
        const outcome = await service.reconcile(id);
        if (outcome?.paymentPublicId !== id || typeof outcome.result !== 'string') throw failure('PAYMENT_RESPONSE_INVALID');
        const payment = await ownedPayment(id);
        if (payment.status === 'paid') await Promise.all([service.currentSubscription(), cards()]);
        return payment;
      } catch (error) {
        if (error.status === 429) deadlines.set(id, now() + rateLimitDelay(error) * 1000);
        throw error;
      } finally { busy = false; }
    },
    async resolveReturn(merchantOrderId) {
      await assertUser();
      const intent = await intents.read(userPublicId);
      if (intent?.publicId) {
        const saved = await ownedPayment(intent.publicId);
        if (!merchantOrderId || saved.merchantOrderId === merchantOrderId) return saved;
        // An older intent must not mask a different return order. The hint can
        // only select a payment from owned server history, never grant entitlement.
      }
      const history = await service.listPayments();
      await assertUser();
      const match = Array.isArray(history) && typeof merchantOrderId === 'string'
        ? history.find(payment => payment.merchantOrderId === merchantOrderId) : null;
      return match ? ownedPayment(match.publicId) : null;
    },
  };
}
