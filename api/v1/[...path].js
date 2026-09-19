const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);
const PROXY_UPSTREAM_TIMEOUT_MS = 30_000;

function configuredBackendOrigin() {
  const configured = String(process.env.BACKEND_API_BASE_URL ?? '').trim();

  try {
    const url = new URL(configured);
    const hostname = url.hostname.toLowerCase();
    const isTemporaryOrLocal = hostname === 'localhost'
      || hostname === '127.0.0.1'
      || hostname === '::1'
      || hostname.endsWith('.trycloudflare.com');

    if (
      url.protocol !== 'https:'
      || isTemporaryOrLocal
      || url.username
      || url.password
      || url.search
      || url.hash
      || (url.pathname !== '' && url.pathname !== '/')
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function jsonError(status, code, message) {
  return Response.json(
    { success: false, code, message },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}

function forwardedHeaders(headers) {
  const safeHeaders = new Headers();
  for (const [name, value] of headers.entries()) {
    if (!HOP_BY_HOP_HEADERS.has(name.toLowerCase()) && name.toLowerCase() !== 'host') {
      safeHeaders.set(name, value);
    }
  }
  return safeHeaders;
}

export default {
  async fetch(request) {
    const backendOrigin = configuredBackendOrigin();
    if (!backendOrigin) {
      return jsonError(
        503,
        'BACKEND_NOT_CONFIGURED',
        'Backend API production origin is not configured.',
      );
    }

    const incomingUrl = new URL(request.url);
    if (!incomingUrl.pathname.startsWith('/api/v1/')) {
      return jsonError(404, 'NOT_FOUND', 'Resource not found.');
    }

    const method = request.method.toUpperCase();
    if (method === 'CONNECT' || method === 'TRACE') {
      return jsonError(405, 'METHOD_NOT_ALLOWED', 'HTTP method is not allowed.');
    }

    const targetUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, backendOrigin);
    const options = {
      method,
      headers: forwardedHeaders(request.headers),
      redirect: 'manual',
      signal: AbortSignal.timeout(PROXY_UPSTREAM_TIMEOUT_MS),
    };

    if (method !== 'GET' && method !== 'HEAD') {
      options.body = request.body;
      options.duplex = 'half';
    }

    try {
      const upstream = await fetch(targetUrl, options);
      const responseHeaders = forwardedHeaders(upstream.headers);
      responseHeaders.set('cache-control', 'no-store');
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch {
      return jsonError(502, 'BACKEND_UNAVAILABLE', 'Backend API is temporarily unavailable.');
    }
  },
};
