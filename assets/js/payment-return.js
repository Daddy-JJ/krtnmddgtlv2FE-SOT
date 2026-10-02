// Browser query is an untrusted lookup hint, never payment confirmation.
(() => {
  const hint = new URLSearchParams(location.search).get('merchantOrderId');
  globalThis.__KND_PAYMENT_RETURN__ = typeof hint === 'string' && hint.length <= 256 ? hint : null;
  history.replaceState(null, '', location.pathname);
})();
