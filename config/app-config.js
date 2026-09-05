import './runtime-config.js';

const runtimeConfig = globalThis.__KND_CONFIG__ ?? {};

export const appConfig = Object.freeze({
  apiBaseUrl: runtimeConfig.apiBaseUrl ?? '/api/v1',
  requestTimeoutMs: runtimeConfig.requestTimeoutMs ?? 12_000,
  defaultLocale: 'id',
  supportedLocales: Object.freeze(['id']),
});
