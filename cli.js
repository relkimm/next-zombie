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
const MAX_RESTARTS = 20;
const CRASH_WINDOW = 5000;
const MAX_FAST_CRASHES = 3;

let timer = null;
let child = null;
let pending = false;

// Stats
const startTime = Date.now();
let restarts = 0;
const crashTimes = [];

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

function isCrashLoop() {
  const now = Date.now();
  crashTimes.push(now);

  if (restarts >= MAX_RESTARTS) {
    error(`Max restarts (${MAX_RESTARTS}) reached`);
    return true;
  }

  // Keep only crashes within window
  while (crashTimes.length > 0 && crashTimes[0] < now - CRASH_WINDOW) {
    crashTimes.shift();
  }

  if (crashTimes.length >= MAX_FAST_CRASHES) {
    error(`Too many crashes in ${CRASH_WINDOW / 1000}s (possible config error)`);
    return true;
  }

  return false;
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
    if (isCrashLoop()) {
      showStats();
      process.exit(1);
    }
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

  if (isCrashLoop()) {
    showStats();
    process.exit(1);
  }

  warn(`Restarting #${restarts}...`);
  clearCache();
  setTimeout(start, INTERVAL);
}

function checkScript(script) {
  const pkgPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(pkgPath)) {
    error('No package.json found');
    process.exit(1);
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    if (!pkg.scripts || !pkg.scripts[script]) {
      error(`Script "${script}" not found in package.json`);
      process.exit(1);
    }
  } catch (err) {
    error(`Failed to read package.json: ${err.message}`);
    process.exit(1);
  }
}

function start() {
  const pm = detectPM();
  const { script, extra } = parseArgs(process.argv.slice(2));

  if (restarts === 0) {
    checkScript(script);
  }

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
