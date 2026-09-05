import { createLocalFrontendServer } from '../../scripts/local-server.mjs';

export { createLocalFrontendServer };

export function localBackendEnvironment({
  environment = process.env,
  frontendPort,
  backendPort,
} = {}) {
  return {
    ...environment,
    APP_URL: 'http://127.0.0.1:' + frontendPort,
    PORT: String(backendPort),
  };
}
