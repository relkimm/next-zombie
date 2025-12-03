const PATTERNS = [
  /_buildManifest\.js\.tmp/,
  /ENOENT:.*\.next/,
];

function detectPM(cwd = process.cwd()) {
  const fs = require('fs');
  const path = require('path');

  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun';
  return 'npm';
}

function matchError(text) {
  return PATTERNS.some((p) => p.test(text));
}

function parseArgs(args) {
  const script = args[0] && !args[0].startsWith('-') ? args[0] : 'dev';
  const extra = args[0] && !args[0].startsWith('-') ? args.slice(1) : args;
  return { script, extra };
}

function buildArgs(script, extra) {
  const args = ['run', script];
  if (extra.length > 0) args.push('--', ...extra);
  return args;
}

module.exports = { PATTERNS, detectPM, matchError, parseArgs, buildArgs };
