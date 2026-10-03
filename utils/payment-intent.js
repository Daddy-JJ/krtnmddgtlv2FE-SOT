import { isPaymentId, validatePlanCode } from '../validators/payment-validator.js';

export const PAYMENT_INTENT_KEY = 'knd.payment.intent';
const unavailable = () => Object.assign(new Error('Payment coordination unavailable'), { code: 'PAYMENT_COORDINATION_UNAVAILABLE' });
function validIntent(value, user) {
  return value?.userPublicId === user && isPaymentId(user) && isPaymentId(value.key)
    && !validatePlanCode(value.planCode) && (!value.publicId || isPaymentId(value.publicId));
}
function metadata(value) {
  return { userPublicId: value.userPublicId, key: value.key, planCode: value.planCode, publicId: value.publicId || null };
}

// Session navigation metadata only: never credentials, payment URL, or provider reference.
export function createIntentStore(storage = () => globalThis.sessionStorage) {
  let memory = null;
  let storageFailed = false;
  return {
    read(user) {
      if (!storageFailed) {
        try { memory = JSON.parse(storage()?.getItem(PAYMENT_INTENT_KEY) || 'null'); }
        catch { storageFailed = true; }
      }
      if (!validIntent(memory, user)) return null;
      return metadata(memory);
    },
    write(value) {
      if (!validIntent(value, value?.userPublicId)) throw unavailable();
      memory = metadata(value);
      try { storage()?.setItem(PAYMENT_INTENT_KEY, JSON.stringify(memory)); }
      catch { storageFailed = true; }
    },
    clear(user) {
      if (user && memory?.userPublicId !== user) return;
      memory = null;
      try { storage()?.removeItem(PAYMENT_INTENT_KEY); } catch { storageFailed = true; }
    },
  };
}

// The shared record provides the SAME intent key across tabs, including ambiguous POST outcomes.
// All access for checkout happens under a Web Lock. IndexedDB holds only the same non-secret metadata.
export function createBrowserIntentStore({ session = createIntentStore(), database = () => globalThis.indexedDB } = {}) {
  let opening;
  async function db() {
    if (!opening) opening = new Promise((resolve, reject) => {
      try {
        const request = database()?.open('knd-payment-intents', 1);
        if (!request) { reject(unavailable()); return; }
        request.onupgradeneeded = () => request.result.createObjectStore('intent');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(unavailable());
        request.onblocked = () => reject(unavailable());
      } catch { reject(unavailable()); }
    });
    return opening;
  }
  async function access(mode, operation) {
    const connection = await db();
    return new Promise((resolve, reject) => {
      try {
        const transaction = connection.transaction('intent', mode);
        const request = operation(transaction.objectStore('intent'));
        transaction.oncomplete = () => resolve(request.result);
        transaction.onerror = transaction.onabort = () => reject(unavailable());
      } catch { reject(unavailable()); }
    });
  }
  return {
    ensureShared: db,
    clearLocal: () => session.clear(),
    bindLocal(user) { if (!session.read(user)) session.clear(); },
    async read(user) {
      let shared;
      try { shared = await access('readonly', store => store.get('active')); }
      catch { return session.read(user); } // Return/history can work with session metadata alone.
      if (validIntent(shared, user)) { session.write(shared); return metadata(shared); }
      const saved = session.read(user);
      if (shared && shared.userPublicId !== user) { session.clear(); await this.clear(shared.userPublicId); }
      return shared ? null : saved;
    },
    async write(value) {
      if (!validIntent(value, value?.userPublicId)) throw unavailable();
      // Durable shared write BEFORE POST; unavailable storage closes new checkout.
      await access('readwrite', store => store.put(metadata(value), 'active'));
      session.write(value);
    },
    async clear(user) {
      session.clear(user);
      try {
        if (!user) await access('readwrite', store => store.delete('active'));
        else {
          const connection = await db();
          await new Promise((resolve, reject) => {
            const transaction = connection.transaction('intent', 'readwrite');
            const store = transaction.objectStore('intent');
            const request = store.get('active');
            request.onsuccess = () => { if (request.result?.userPublicId === user) store.delete('active'); };
            transaction.oncomplete = resolve;
            transaction.onerror = transaction.onabort = reject;
          });
        }
      } catch { /* auth must still succeed */ }
    },
  };
}

export const paymentIntents = createBrowserIntentStore();
let sessionVersion = 0;
export const paymentSessionVersion = () => sessionVersion;
function invalidatePaymentSession() {
  sessionVersion += 1;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('payment:session-changed'));
}
export async function paymentSessionChanged(userPublicId) {
  invalidatePaymentSession();
  // Re-authentication of the SAME user must not rotate an ambiguous purchase key.
  const sameIntent = isPaymentId(userPublicId) ? await paymentIntents.read(userPublicId) : null;
  if (!sameIntent) await paymentIntents.clear();
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('knd.payment.session');
    channel.postMessage({ userPublicId: isPaymentId(userPublicId) ? userPublicId : null }); channel.close();
  }
}
if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
  const channel = new BroadcastChannel('knd.payment.session');
  // The sender already cleared shared storage; a delayed notification must not
  // delete a newly created intent from the current session.
  channel.onmessage = event => {
    invalidatePaymentSession();
    if (isPaymentId(event.data?.userPublicId)) paymentIntents.bindLocal(event.data.userPublicId);
    else paymentIntents.clearLocal();
  };
}
