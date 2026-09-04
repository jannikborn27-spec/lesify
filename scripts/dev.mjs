#!/usr/bin/env node
/**
 * Ein Befehl startet die ganze lokale Umgebung:
 *
 *   pnpm dev
 *
 *   - API       -> http://localhost:3000   (Fastify, api/)
 *   - App       -> http://localhost:4001   (statisch, app/)
 *   - Marketing -> http://localhost:4002   (statisch, marketing/)
 *
 * app/ und marketing/ brauchen keinen Build — sie werden nur statisch serviert
 * (python3, wie im bisherigen Prototyp-Workflow).
 */
import { spawn } from 'node:child_process';

const jobs = [
  { name: 'api      ', cmd: 'pnpm', args: ['--filter', './api', 'dev'] },
  { name: 'app      ', cmd: 'python3', args: ['-m', 'http.server', '4001', '--directory', 'app'] },
  {
    name: 'marketing',
    cmd: 'python3',
    args: ['-m', 'http.server', '4002', '--directory', 'marketing'],
  },
];

const children = jobs.map(({ name, cmd, args }) => {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  const print = (line) => {
    if (line.trim()) console.log(`[${name}] ${line}`);
  };
  child.stdout.on('data', (d) => d.toString().split('\n').forEach(print));
  child.stderr.on('data', (d) => d.toString().split('\n').forEach(print));
  child.on('error', (err) => {
    console.error(`[${name}] konnte nicht starten: ${err.message}`);
    shutdown();
  });
  child.on('exit', (code) => {
    console.log(`[${name}] beendet (code ${code ?? 0})`);
    shutdown();
  });
  return child;
});

let down = false;
function shutdown() {
  if (down) return;
  down = true;
  for (const c of children) {
    try {
      c.kill('SIGTERM');
    } catch {
      /* egal */
    }
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
