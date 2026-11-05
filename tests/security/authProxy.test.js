import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { test } from 'node:test';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const PROXY_SCRIPT = path.join(REPO_ROOT, 'scripts', 'ci', 'auth-proxy.js');

/**
 * Start a throw-away upstream server that echoes the received
 * `Authorization` header back to the caller.
 */
function startUpstream() {
  const received = [];
  const server = http.createServer((req, res) => {
    received.push({ authorization: req.headers.authorization, url: req.url });
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ authorization: req.headers.authorization ?? null }));
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, received, port });
    });
  });
}

/**
 * Start the auth proxy and wait until it accepts connections.
 */
async function startProxy(targetPort, token, proxyPort) {
  const child = spawn(process.execPath, [PROXY_SCRIPT], {
    env: {
      ...process.env,
      AUTH_PROXY_TARGET: `http://127.0.0.1:${targetPort}`,
      AUTH_PROXY_TOKEN: token,
      AUTH_PROXY_PORT: String(proxyPort),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('the auth proxy did not start')), 10000);
    child.stdout.on('data', (chunk) => {
      if (String(chunk).includes('auth-proxy:')) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on('error', reject);
  });

  return child;
}

function get(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      })
      .on('error', reject);
  });
}

test('the auth proxy injects the bearer token into every request', async (t) => {
  const upstream = await startUpstream();
  const proxyPort = 34000 + Math.floor(Math.random() * 1000);
  const child = await startProxy(upstream.port, 'ci-placeholder-key', proxyPort);

  t.after(async () => {
    child.kill('SIGTERM');
    await new Promise((resolve) => upstream.server.close(resolve));
  });

  const response = await get(`http://127.0.0.1:${proxyPort}/api/health`);
  assert.equal(response.status, 200);
  const payload = JSON.parse(response.body);
  assert.equal(payload.authorization, 'Bearer ci-placeholder-key');
  assert.equal(upstream.received.length, 1);
  assert.equal(upstream.received[0].authorization, 'Bearer ci-placeholder-key');
});

test('the auth proxy forwards the request path and method unchanged', async (t) => {
  const upstream = await startUpstream();
  const proxyPort = 35000 + Math.floor(Math.random() * 1000);
  const child = await startProxy(upstream.port, 'ci-placeholder-key', proxyPort);

  t.after(async () => {
    child.kill('SIGTERM');
    await new Promise((resolve) => upstream.server.close(resolve));
  });

  await get(`http://127.0.0.1:${proxyPort}/api/v1/models?limit=5`);
  assert.equal(upstream.received.length, 1);
  assert.equal(upstream.received[0].url, '/api/v1/models?limit=5');
});

test('the auth proxy refuses to start without a token', async () => {
  const child = spawn(process.execPath, [PROXY_SCRIPT], {
    env: { ...process.env, AUTH_PROXY_TOKEN: '', AUTH_PROXY_PORT: '35999' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const code = await new Promise((resolve) => {
    child.on('exit', (exitCode) => resolve(exitCode));
  });

  assert.equal(code, 1);
});
