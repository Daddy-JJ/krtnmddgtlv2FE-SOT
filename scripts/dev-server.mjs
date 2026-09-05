import { createLocalFrontendServer } from './local-server.mjs';

const host = process.env.FRONTEND_HOST ?? '127.0.0.1';
const port = Number(process.env.FRONTEND_PORT ?? 8080);
const backendOrigin = new URL(process.env.BACKEND_ORIGIN ?? 'http://127.0.0.1:3000');
const server = createLocalFrontendServer({ backendOrigin });

server.on('error', (error) => {
  console.error('Frontend dev server gagal: ' + error.message);
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log('Frontend dev server: http://' + host + ':' + port);
  console.log('Backend API proxy: ' + backendOrigin.origin + '/api/v1');
});

function shutdown(signal) {
  server.close((error) => {
    if (error) {
      console.error('Frontend dev server gagal berhenti: ' + error.message);
      process.exitCode = 1;
    }
    console.log('Frontend dev server berhenti (' + signal + ').');
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
