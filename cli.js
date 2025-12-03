#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');
const pc = require('picocolors');
const { detectPM, matchError, parseArgs, buildArgs } = require('./lib');

const TAG = pc.magenta('[next-zombie]');
const CACHE = path.join(process.cwd(), '.next');
const DELAY = 1500;
const INTERVAL = 500;

let timer = null;
let child = null;
let pending = false;

function log(msg) {
  console.log(`${TAG} ${msg}`);
}

function clearCache() {
  if (!fs.existsSync(CACHE)) return;
  try {
    log(pc.dim('Cleaning .next cache...'));
    fs.rmSync(CACHE, { recursive: true, force: true });
  } catch {}
}

function schedule() {
  if (pending) return;

  log(pc.red('Cache error detected!'));
  log(pc.yellow(`Restarting in ${DELAY / 1000}s...`));

  pending = true;
  timer = setTimeout(() => {
    timer = null;
    child?.kill('SIGTERM');
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
    log(pc.yellow('Restarting...'));
    clearCache();
    setTimeout(start, INTERVAL);
    return;
  }

  if (code === 0 || signal === 'SIGINT') {
    process.exit(0);
  }

  if (code !== null && code !== 0) {
    log(pc.red(`Crashed with exit code ${code}`));
  }

  log(pc.yellow('Restarting...'));
  clearCache();
  setTimeout(start, INTERVAL);
}

function start() {
  const pm = detectPM();
  const { script, extra } = parseArgs(process.argv.slice(2));
  const args = buildArgs(script, extra);

  log(pc.green('Starting Next.js with auto-recovery...'));
  log(pc.dim(`$ ${pm} ${args.join(' ')}\n`));

  child = spawn(pm, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
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
  child?.kill('SIGINT');
  process.exit(0);
});

clearCache();
start();
