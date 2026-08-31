import './runtime-config.js';

export const appConfig = Object.freeze({
  apiBaseUrl: globalThis.__KND_CONFIG__?.apiBaseUrl ?? '/api/v1',
  requestTimeoutMs: globalThis.__KND_CONFIG__?.requestTimeoutMs ?? 12_000,
  defaultLocale: 'id',
  supportedLocales: Object.freeze(['id']),
});
