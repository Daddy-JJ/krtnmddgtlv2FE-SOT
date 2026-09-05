// cPanel replaces these public-only placeholders from its local .env during deployment.
// They must never contain credentials, tokens, or database settings.
const injectedApiBaseUrl = '__PUBLIC_API_BASE_URL__';
const injectedTimeout = '__PUBLIC_API_TIMEOUT_MS__';
const sameOriginApiBaseUrl = '/api/v1';
const localApiBaseUrl = 'http://127.0.0.1:3000/api/v1';
const serverConfig = globalThis.__KND_CONFIG__;
const hostname = typeof globalThis.location?.hostname === 'string'
  ? globalThis.location.hostname.toLowerCase()
  : '';
const isLocalHostname = hostname === 'localhost' || hostname === '127.0.0.1';
const apiBaseUrl = injectedApiBaseUrl === '__PUBLIC_API_BASE_URL__'
  ? (isLocalHostname ? localApiBaseUrl : sameOriginApiBaseUrl)
  : injectedApiBaseUrl;
const requestTimeoutMs = /^\d+$/.test(injectedTimeout) ? Number(injectedTimeout) : 12_000;

globalThis.__KND_CONFIG__ = Object.freeze({
  apiBaseUrl: serverConfig?.apiBaseUrl ?? apiBaseUrl,
  requestTimeoutMs: serverConfig?.requestTimeoutMs ?? requestTimeoutMs,
});
