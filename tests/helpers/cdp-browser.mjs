import { spawn } from 'node:child_process';
import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function waitFor(check, description, timeout = 15_000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await pause(100);
  }
  throw new Error(`Browser timeout: ${description}`);
}
export async function launchBrowser() {
  const candidates = [process.env.KND_QA_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
  let executable;
  for (const candidate of candidates) { try { await access(candidate); executable = candidate; break; } catch {} }
  if (!executable) throw new Error('Chromium/Edge unavailable; browser QA was NOT run. Set KND_QA_BROWSER.');
  const profile = await mkdtemp(path.join(os.tmpdir(), 'knd-duitku-qa-'));
  const processHandle = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--disable-background-networking', '--disable-component-update', '--disable-sync', '--metrics-recording-only',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1',
    '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1', `--user-data-dir=${profile}`, 'about:blank'],
  { windowsHide: true, stdio: 'ignore' });
  let port;
  try {
    await waitFor(async () => {
      try { port = Number((await readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); return Number.isInteger(port) && port > 0; }
      catch { return false; }
    }, 'launch headless browser');
  } catch (error) { processHandle.kill(); throw error; }
  const connections = [];
  return {
    executable,
    async tab() {
      const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
      const socket = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
      let sequence = 0;
      let loads = 0;
      const pending = new Map();
      const errors = [];
      socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.method === 'Page.loadEventFired') loads += 1;
        if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
        const request = pending.get(message.id);
        if (request) { pending.delete(message.id); message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result); }
      });
      function send(method, params = {}) {
        const id = ++sequence;
        return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
      }
      async function evaluate(expression) {
        const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
      }
      await send('Page.enable'); await send('Runtime.enable');
      await send('Page.addScriptToEvaluateOnNewDocument', { source: "globalThis.__KND_CONFIG__={apiBaseUrl:'/api/v1'};localStorage.setItem('knd.theme.preference','light');" });
      const connection = { send, evaluate, errors, close: () => socket.close(), async navigate(url) {
        const previous = loads;
        await send('Page.navigate', { url });
        await waitFor(() => loads > previous, 'page document loaded');
      } };
      connections.push(connection);
      return connection;
    },
    async close() {
      for (const connection of connections) connection.close();
      processHandle.kill();
      await pause(300);
      const resolved = path.resolve(profile);
      if (path.dirname(resolved) === path.resolve(os.tmpdir()) && path.basename(resolved).startsWith('knd-duitku-qa-')) {
        await rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }
    },
  };
}
