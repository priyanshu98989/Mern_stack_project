import { spawn, spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';
const shell = isWindows;

const targets = [
  { name: 'server', args: ['run', 'dev', '--prefix', 'server'] },
  { name: 'client', args: ['run', 'dev', '--prefix', 'client'] },
];

const children = new Set();
let shuttingDown = false;

function prefixStream(stream, name, target) {
  let buffer = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || '';
    for (const line of lines) target.write(`[${name}] ${line}\n`);
  });
  stream.on('end', () => {
    if (buffer) target.write(`[${name}] ${buffer}\n`);
  });
}

function stopChild(child) {
  if (child.killed) return;
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  child.kill('SIGTERM');
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) stopChild(child);
  setTimeout(() => process.exit(code), 300);
}

for (const target of targets) {
  const child = spawn(npm, target.args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell,
    env: process.env,
  });
  children.add(child);
  prefixStream(child.stdout, target.name, process.stdout);
  prefixStream(child.stderr, target.name, process.stderr);
  child.on('exit', (code, signal) => {
    children.delete(child);
    if (shuttingDown) return;
    if (code && code !== 0) {
      console.error(`[${target.name}] exited with ${signal || `code ${code}`}`);
      shutdown(code || 1);
    }
  });
  child.on('error', (err) => {
    console.error(`[${target.name}] failed to start:`, err.message);
    shutdown(1);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
