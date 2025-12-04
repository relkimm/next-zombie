#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');
const pc = require('picocolors');
const { detectPM, matchError, parseArgs, buildArgs } = require('./lib');

const TAG = pc.magenta('[next-zombie]');
const CACHE = path.join(process.cwd(), '.next');
const DELAY = 500;
const INTERVAL = 200;

let timer = null;
let child = null;
let pending = false;

// Stats
const startTime = Date.now();
let restarts = 0;

function log(msg) {
  console.log(`${TAG} ${msg}`);
}

function info(msg) {
  log(pc.cyan(msg));
}

function success(msg) {
  log(pc.green(msg));
}

function warn(msg) {
  log(pc.yellow(msg));
}

function error(msg) {
  log(pc.red(msg));
}

function dim(msg) {
  log(pc.dim(msg));
}

function formatUptime(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function showStats() {
  const uptime = formatUptime(Date.now() - startTime);
  info(`Session: ${restarts} restart${restarts !== 1 ? 's' : ''}, uptime ${uptime}`);
}

function clearCache() {
  if (!fs.existsSync(CACHE)) return;
  try {
    dim('Clearing .next cache...');
    fs.rmSync(CACHE, { recursive: true, force: true });
  } catch (err) {
    warn(`Failed to clear cache: ${err.message}`);
  }
}

function killChild() {
  if (!child) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch (err) {
    dim(`Process group kill failed: ${err.code || err.message}`);
    try {
      child.kill('SIGTERM');
    } catch (killErr) {
      warn(`Failed to kill process: ${killErr.message}`);
    }
  }
}

function schedule() {
  if (pending) return;

  error('Cache error detected');
  warn(`Restarting in ${DELAY}ms...`);

  pending = true;
  timer = setTimeout(() => {
    timer = null;
    killChild();
  }, DELAY);
}

function onExit(code, signal) {
  child = null;

  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  if (pending) {
    pending = false;
    restarts++;
    warn(`Restarting #${restarts}...`);
    clearCache();
    setTimeout(start, INTERVAL);
    return;
  }

  if (code === 0 || signal === 'SIGINT') {
    showStats();
    process.exit(0);
  }

  restarts++;
  if (code !== null && code !== 0) {
    error(`Process crashed with exit code ${code}`);
  }

  warn(`Restarting #${restarts}...`);
  clearCache();
  setTimeout(start, INTERVAL);
}

function start() {
  const pm = detectPM();
  const { script, extra } = parseArgs(process.argv.slice(2));
  const args = buildArgs(script, extra);

  success('Starting Next.js dev server...');
  dim(`$ ${pm} ${args.join(' ')}\n`);

  child = spawn(pm, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
    detached: true,
  });

  const monitor = (stream, out) => {
    stream.on('data', (data) => {
      const text = data.toString();
      out.write(text);
      if (matchError(text)) schedule();
    });
  };

  monitor(child.stdout, process.stdout);
  monitor(child.stderr, process.stderr);
  child.on('exit', onExit);
}

process.on('SIGINT', () => {
  pending = false;
  if (timer) clearTimeout(timer);
  killChild();
  showStats();
  process.exit(0);
});

clearCache();
start();
