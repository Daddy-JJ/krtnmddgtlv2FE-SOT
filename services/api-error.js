export class ApiError extends Error {
  constructor({ status = 0, code = 'NETWORK_ERROR', message = 'Request failed.', details = null, requestId = null, retryAfterSeconds = null, retryAfter = null }) {
    super(message); this.name = 'ApiError'; this.status = status; this.code = code; this.details = details; this.requestId = requestId; this.retryAfterSeconds = retryAfterSeconds;
    this.retryAfter = retryAfter;
  }
}
