// Deploys a generated HTML app to Locus Build via git-push deploy.
// Per-request lifecycle: create project -> init git -> push -> poll -> return URL -> schedule teardown.

import { execFile } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';

const execFileP = promisify(execFile);

const BUILD_BASE = process.env.LOCUS_BUILD_BASE || 'https://beta-api.buildwithlocus.com/v1';
const GIT_BASE = process.env.LOCUS_GIT_BASE || 'beta-git.buildwithlocus.com';

const idleTimers = new Map();

function log(...args) { console.log('[deployer]', ...args); }

async function locusFetch({ token, method = 'GET', path: p, body }) {
  const res = await fetch(`${BUILD_BASE}${p}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  if (!res.ok) {
    const err = new Error(`Locus Build ${res.status} ${method} ${p}: ${text}`);
    err.status = res.status; err.body = json;
    throw err;
  }
  return json;
}

export async function deployGeneratedApp({ html, jwt, apiKey, workspaceId, appName }) {
  const safeName = (appName || 'zearch-app').toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 30) || 'zearch-app';
  const projectName = `${safeName}-${Math.random().toString(36).slice(2, 8)}`;

  log('Creating project', projectName);
  const project = await locusFetch({
    token: jwt, method: 'POST', path: '/projects',
    body: { name: projectName, description: 'Ephemeral Zearch app' },
  });
  const projectId = project.id;

  const env = await locusFetch({
    token: jwt, method: 'POST', path: `/projects/${projectId}/environments`,
    body: { name: 'production', type: 'production' },
  });
  const environmentId = env.id;

  const service = await locusFetch({
    token: jwt, method: 'POST', path: '/services',
    body: {
      projectId, environmentId,
      name: 'web',
      source: { type: 's3', rootDir: '.' },
      runtime: { port: 8080, cpu: 256, memory: 512, minInstances: 1, maxInstances: 1 },
      healthCheckPath: '/',
    },
  });
  const serviceId = service.id;
  const serviceUrl = service.url || `https://svc-${serviceId.replace(/_/g, '-')}.buildwithlocus.com`;

  const workDir = await prepareRepo({ html });
  try {
    log('Pushing to Locus git remote...');
    const credential = apiKey || jwt;
    const remote = `https://x:${credential}@${GIT_BASE}/${workspaceId}/${projectId}.git`;
    await runGit(workDir, ['init', '-b', 'main']);
    await runGit(workDir, ['config', 'user.email', 'zearch@local']);
    await runGit(workDir, ['config', 'user.name', 'Zearch']);
    await runGit(workDir, ['add', '.']);
    await runGit(workDir, ['commit', '-m', 'zearch: initial deploy']);
    await runGit(workDir, ['remote', 'add', 'locus', remote]);
    const push = await runGit(workDir, ['push', 'locus', 'main'], { timeout: 120_000 });
    log('Push output:', push.stdout?.slice(0, 500), push.stderr?.slice(0, 500));
  } finally {
    rm(workDir, { recursive: true, force: true }).catch(() => {});
  }

  let deploymentId;
  for (let i = 0; i < 10; i++) {
    try {
      const deployments = await locusFetch({ token: jwt, path: `/deployments/service/${serviceId}?limit=1` });
      const list = deployments.deployments || deployments.items || (Array.isArray(deployments) ? deployments : []);
      const latest = list[0];
      if (latest?.id) { deploymentId = latest.id; break; }
    } catch (e) { log('deployments list attempt failed:', e.message); }
    await new Promise(r => setTimeout(r, 2000));
  }

  return { projectId, environmentId, serviceId, deploymentId, serviceUrl };
}

export async function getDeploymentStatus({ jwt, deploymentId }) {
  if (!deploymentId) return { status: 'unknown' };
  return locusFetch({ token: jwt, path: `/deployments/${deploymentId}` });
}

export async function teardown({ jwt, projectId }) {
  log('Tearing down project', projectId);
  try {
    await locusFetch({ token: jwt, method: 'DELETE', path: `/projects/${projectId}` });
  } catch (e) {
    log('Teardown error (non-fatal):', e.message);
  }
  const t = idleTimers.get(projectId);
  if (t) { clearTimeout(t); idleTimers.delete(projectId); }
}

export function scheduleTeardown({ jwt, projectId, delayMs = 30 * 60_000 }) {
  const existing = idleTimers.get(projectId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => teardown({ jwt, projectId }), delayMs);
  timer.unref?.();
  idleTimers.set(projectId, timer);
  return { tearDownAt: new Date(Date.now() + delayMs).toISOString() };
}

async function prepareRepo({ html }) {
  const dir = await mkdir(path.join(os.tmpdir(), `zearch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`), { recursive: true });
  const workDir = dir;
  await writeFile(path.join(workDir, 'public', 'index.html').replace(/\\/g, '/'), '', { flag: 'w' }).catch(() => {});
  await mkdir(path.join(workDir, 'public'), { recursive: true });
  await writeFile(path.join(workDir, 'public', 'index.html'), html);
  await writeFile(path.join(workDir, 'server.js'), serverJs());
  await writeFile(path.join(workDir, 'package.json'), packageJson());
  await writeFile(path.join(workDir, 'Dockerfile'), dockerfile());
  await writeFile(path.join(workDir, '.dockerignore'), 'node_modules\n.git\n');
  return workDir;
}

function serverJs() {
  return `const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const HTML = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/' || url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return res.end(HTML);
  }
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  const p = path.join(__dirname, 'public', url);
  if (p.startsWith(path.join(__dirname, 'public')) && fs.existsSync(p) && fs.statSync(p).isFile()) {
    return fs.createReadStream(p).pipe(res);
  }
  res.writeHead(404); res.end('not found');
}).listen(PORT, '0.0.0.0', () => console.log('zearch app on :' + PORT));
`;
}

function packageJson() {
  return JSON.stringify({
    name: 'zearch-app',
    version: '0.0.1',
    private: true,
    main: 'server.js',
    scripts: { start: 'node server.js' },
    engines: { node: '>=20' },
  }, null, 2);
}

function dockerfile() {
  return `FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY server.js ./
COPY public ./public
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
`;
}

function runGit(cwd, args, opts = {}) {
  return execFileP('git', args, { cwd, timeout: 60_000, ...opts });
}
