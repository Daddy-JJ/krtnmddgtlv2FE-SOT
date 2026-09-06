import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createLocalFrontendServer, localBackendEnvironment } from './helpers/local-stack.mjs';

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

async function close(server) {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}

test('local stack overrides a deployed APP_URL with its active frontend origin', () => {
  const environment = localBackendEnvironment({
    environment: { APP_URL: 'https://frontend.example.test', DB_PASSWORD: 'preserved' },
    frontendPort: 4100,
    backendPort: 4101,
  });

  assert.equal(environment.APP_URL, 'http://127.0.0.1:4100');
  assert.equal(environment.PORT, '4101');
  assert.equal(environment.DB_PASSWORD, 'preserved');
});

test('local stack serves frontend routes and proxies /api/v1 on one origin', async () => {
  const backend = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ path: request.url }));
  });
  const backendPort = await listen(backend);
  const frontend = createLocalFrontendServer({ backendOrigin: new URL(`http://127.0.0.1:${backendPort}`) });
  const frontendPort = await listen(frontend);
  const origin = `http://127.0.0.1:${frontendPort}`;

  try {
    const home = await fetch(`${origin}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /<!doctype html>/i);

    const proxy = await fetch(`${origin}/api/v1/health?probe=1`);
    assert.equal(proxy.status, 200);
    assert.deepEqual(await proxy.json(), { path: '/api/v1/health?probe=1' });

    const publicSlug = await fetch(origin + '/YAjXHrF');
    assert.equal(publicSlug.url, origin + '/YAjXHrF');
    assert.equal(publicSlug.status, 200);
    const publicSlugHtml = await publicSlug.text();
    assert.match(publicSlugHtml, /data-public-content/);
    assert.doesNotMatch(publicSlugHtml, /data-landing-content/);

    const reportedSlug = await fetch(origin + '/PCiZZvU');
    assert.equal(reportedSlug.url, origin + '/PCiZZvU');
    assert.equal(reportedSlug.status, 200);
    const reportedSlugHtml = await reportedSlug.text();
    assert.match(reportedSlugHtml, /data-public-content/);
    assert.doesNotMatch(reportedSlugHtml, /data-landing-content/);

    const publicCardCss = await fetch(origin + '/assets/css/public-card.css');
    assert.equal(publicCardCss.status, 200);
    assert.match(publicCardCss.headers.get('content-type') ?? '', /^text\/css/i);

    const publicCard = await fetch(`${origin}/QaStart`);
    assert.equal(publicCard.status, 200);
    assert.match(await publicCard.text(), /data-public-content/);

    assert.equal((await fetch(`${origin}/missing/nested/path`)).status, 404);
    assert.equal((await fetch(`${origin}/.htaccess`)).status, 404);
  } finally {
    await close(frontend);
    await close(backend);
  }
});
