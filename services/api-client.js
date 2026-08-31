import { appConfig } from '../config/app-config.js';
import { csrfToken } from '../utils/cookies.js';
import { ApiError } from './api-error.js';

const unsafe = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const requestId = () => globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}`;

export function buildApiUrl(path, baseUrl = appConfig.apiBaseUrl) {
  const normalizedBase = String(baseUrl ?? '').replace(/\/+$/, '');
  const relativePath = String(path ?? '');
  if (!normalizedBase) throw new TypeError('API base URL is required.');
  if (!relativePath.startsWith('/') || relativePath.startsWith('//') || relativePath.includes('\\')) {
    throw new TypeError('API path must be a root-relative path.');
  }
  return `${normalizedBase}${relativePath}`;
}

export class ApiClient {
  #baseUrl;
  #fetch;
  #timeout;
  #cookies;
  #refreshPromise = null;
  #csrfPromise = null;
  #accessCsrfToken = null;

  constructor({ baseUrl = appConfig.apiBaseUrl, fetchImpl = globalThis.fetch, timeoutMs = appConfig.requestTimeoutMs, cookieSource = () => globalThis.document?.cookie ?? '' } = {}) {
    if (typeof fetchImpl !== 'function') throw new TypeError('Fetch implementation is required.');
    this.#baseUrl = baseUrl.replace(/\/$/, '');
    this.#fetch = fetchImpl;
    this.#timeout = timeoutMs;
    this.#cookies = cookieSource;
  }

  get(path, options) { return this.request(path, { ...options, method: 'GET' }); }
  post(path, body, options) { return this.request(path, { ...options, method: 'POST', body }); }
  put(path, body, options) { return this.request(path, { ...options, method: 'PUT', body }); }
  patch(path, body, options) { return this.request(path, { ...options, method: 'PATCH', body }); }
  delete(path, options) { return this.request(path, { ...options, method: 'DELETE' }); }
  async request(path, options = {}) {
    const method = String(options.method ?? 'GET').toUpperCase();
    try { return await this.#send(path, { ...options, method }); }
    catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401 || options.skipRefresh || path === '/auth/refresh') throw error;
      await this.#refresh();
      return this.#send(path, { ...options, method });
    }
  }

  async #refresh() {
    if (!this.#refreshPromise) {
      this.#refreshPromise = this.#send('/auth/refresh', { method: 'POST', csrfContext: 'access' })
        .finally(() => { this.#refreshPromise = null; });
    }
    return this.#refreshPromise;
  }

  async #send(path, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort('timeout'), options.timeoutMs ?? this.#timeout);
    try {
      const headers = new Headers(options.headers);
      const method = options.method;
      headers.set('Accept', 'application/json');
      headers.set('X-Request-ID', requestId());
      if (unsafe.has(method) && options.csrfContext !== null) {
        const context = options.csrfContext ?? 'access';
        const token = csrfToken(context, this.#cookies())
          ?? (context === 'access' ? await this.#accessCsrf() : null);
        if (token) headers.set('X-CSRF-Token', token);
      }
      let body = options.body;
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
      if (body != null && !isFormData) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(body);
      }
      const response = await Reflect.apply(this.#fetch, globalThis, [buildApiUrl(path, this.#baseUrl), { method, headers, body, credentials: 'include', signal: options.signal ?? controller.signal }]);
      const payload = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) {
        const proxyError = payload?.error;
        throw new ApiError({
          status: response.status,
          code: payload?.code ?? proxyError?.code ?? 'HTTP_ERROR',
          message: payload?.message ?? proxyError?.message ?? 'Request failed.',
          details: payload?.errors ?? payload?.data ?? proxyError?.details ?? null,
          requestId: payload?.request_id ?? proxyError?.request_id ?? response.headers.get('x-request-id'),
        });
      }
      return payload && Object.hasOwn(payload, 'data') ? payload.data : payload;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (controller.signal.aborted) throw new ApiError({ code: 'REQUEST_TIMEOUT', message: 'Request timed out.' });
      throw new ApiError({ message: 'Network request failed.' });
    } finally {
      clearTimeout(timer);
    }
  }

  async #accessCsrf() {
    if (this.#accessCsrfToken) return this.#accessCsrfToken;
    if (!this.#csrfPromise) {
      this.#csrfPromise = this.#send('/auth/csrf', { method: 'GET', csrfContext: null })
        .then((payload) => {
          const token = payload?.csrfToken;
          if (typeof token !== 'string' || token.length === 0) {
            throw new ApiError({ code: 'CSRF_INVALID', message: 'CSRF validation failed.' });
          }
          this.#accessCsrfToken = token;
          return token;
        })
        .finally(() => { this.#csrfPromise = null; });
    }
    return this.#csrfPromise;
  }
}

export const api = new ApiClient();
