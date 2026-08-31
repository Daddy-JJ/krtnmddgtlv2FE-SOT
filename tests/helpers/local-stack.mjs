import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PUBLIC_DIRECTORIES, PUBLIC_ROOT_FILES } from '../../scripts/build-static.mjs';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const publicDirectories = new Set(PUBLIC_DIRECTORIES);
const publicRootFiles = new Set(PUBLIC_ROOT_FILES);
const publicSlugPattern = /^\/[A-Za-z0-9][A-Za-z0-9-]{1,98}[A-Za-z0-9]\/?$/;
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.xml', 'application/xml; charset=utf-8'],
]);

export function localBackendEnvironment({
  environment = process.env,
  frontendPort,
  backendPort,
} = {}) {
  return {
    ...environment,
    APP_URL: `http://127.0.0.1:${frontendPort}`,
    PORT: String(backendPort),
  };
}

export function createLocalFrontendServer({ backendOrigin, sourceRoot = projectRoot } = {}) {
  if (!(backendOrigin instanceof URL) || !['http:', 'https:'].includes(backendOrigin.protocol)) {
    throw new TypeError('A valid HTTP backend origin is required.');
  }

  return createServer((request, response) => {
    handleRequest(request, response, { backendOrigin, sourceRoot }).catch(() => {
      if (!response.headersSent) response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Local frontend server error.');
    });
  });
}

async function handleRequest(request, response, { backendOrigin, sourceRoot }) {
  const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
  if (requestUrl.pathname === '/api/v1' || requestUrl.pathname.startsWith('/api/v1/')) {
    await proxyApiRequest(request, response, requestUrl, backendOrigin);
    return;
  }

  if (!['GET', 'HEAD'].includes(request.method ?? 'GET')) {
    response.writeHead(405, { allow: 'GET, HEAD' });
    response.end();
    return;
  }

  const filePath = await resolvePublicFile(sourceRoot, requestUrl.pathname);
  if (!filePath) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found.');
    return;
  }

  const body = await readFile(filePath);
  response.writeHead(200, {
    'content-type': contentTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream',
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

async function resolvePublicFile(sourceRoot, pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (decodedPath.includes('\\') || decodedPath.includes('\0')) return null;
  if (decodedPath === '/') return path.join(sourceRoot, 'index.html');

  const segments = decodedPath.split('/').filter(Boolean);
  const firstSegment = segments[0];
  let relativePath;

  if (segments.length === 1 && publicRootFiles.has(firstSegment)) {
    relativePath = firstSegment;
  } else if (publicDirectories.has(firstSegment)) {
    relativePath = segments.join('/');
  } else if (publicSlugPattern.test(decodedPath)) {
    relativePath = 'public-card/index.html';
  } else {
    return null;
  }

  const resolvedRoot = path.resolve(sourceRoot);
  let candidate = path.resolve(resolvedRoot, relativePath);
  if (candidate !== resolvedRoot && !candidate.startsWith(`${resolvedRoot}${path.sep}`)) return null;

  try {
    const metadata = await stat(candidate);
    if (metadata.isDirectory()) candidate = path.join(candidate, 'index.html');
    return (await stat(candidate)).isFile() ? candidate : null;
  } catch {
    return null;
  }
}

async function proxyApiRequest(request, response, requestUrl, backendOrigin) {
  const upstreamUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, backendOrigin);
  const headers = new Headers(request.headers);
  headers.delete('host');

  const options = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (!['GET', 'HEAD'].includes(request.method ?? 'GET')) {
    options.body = request;
    options.duplex = 'half';
  }

  const upstream = await fetch(upstreamUrl, options);
  response.writeHead(upstream.status, Object.fromEntries(upstream.headers.entries()));
  const body = Buffer.from(await upstream.arrayBuffer());
  response.end(request.method === 'HEAD' ? undefined : body);
}
