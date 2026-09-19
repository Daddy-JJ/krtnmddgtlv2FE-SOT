// The static build/dev server replaces these public-only placeholders from .env.
// They must never contain credentials, tokens, or database settings.
const injectedLocalApiBaseUrl = '__PUBLIC_API_BASE_URL_LOCAL__';
const injectedProductionApiBaseUrl = '__PUBLIC_API_BASE_URL_PRODUCTION__';
const injectedApiBaseUrl = '__PUBLIC_API_BASE_URL__';
const injectedTimeout = '__PUBLIC_API_TIMEOUT_MS__';
const sameOriginApiBaseUrl = '/api/v1';
const serverConfig = globalThis.__KND_CONFIG__;
const hostname = typeof globalThis.location?.hostname === 'string'
  ? globalThis.location.hostname.toLowerCase()
  : '';
const isLocalHostname = hostname === 'localhost' || hostname === '127.0.0.1';
const productionHostnames = new Set([
  'kartunamadigital.id',
  'www.kartunamadigital.id',
  'krtnmdgtlv2-fe-ten.vercel.app',
]);
const isProductionHostname = productionHostnames.has(hostname);
const localPlaceholder = '__PUBLIC_' + 'API_BASE_URL_LOCAL__';
const productionPlaceholder = '__PUBLIC_' + 'API_BASE_URL_PRODUCTION__';
const localApiBaseUrl = injectedLocalApiBaseUrl === localPlaceholder
  ? sameOriginApiBaseUrl
  : injectedLocalApiBaseUrl;
const productionApiBaseUrl = injectedProductionApiBaseUrl === productionPlaceholder
  ? sameOriginApiBaseUrl
  : injectedProductionApiBaseUrl;
const apiBaseUrl = isLocalHostname
  ? localApiBaseUrl
  : isProductionHostname
    ? productionApiBaseUrl
    : sameOriginApiBaseUrl;
const configuredApiBaseUrl = injectedApiBaseUrl === '__PUBLIC_API_BASE_URL__'
  ? apiBaseUrl
  : injectedApiBaseUrl;
const requestTimeoutMs = /^\d+$/.test(injectedTimeout) ? Number(injectedTimeout) : 12_000;

globalThis.__KND_CONFIG__ = Object.freeze({
  apiBaseUrl: serverConfig?.apiBaseUrl ?? configuredApiBaseUrl,
  requestTimeoutMs: serverConfig?.requestTimeoutMs ?? requestTimeoutMs,
});
