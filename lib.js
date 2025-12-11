const PATTERNS = [
  // Cache temp file corruption
  /_buildManifest\.js\.tmp/,
  /build-manifest\.json\.tmp/,
  /_devMiddlewareManifest/,

  // Turbopack internal panic/crash
  /FATAL: An unexpected Turbopack error occurred/,
  /thread caused non-unwinding panic/,
  /panicked at.*turbopack/i,

  // Specific cache directory ENOENT (not user code errors)
  /ENOENT:.*\.next[\\/]static[\\/]development/,
  /ENOENT:.*\.next[\\/]cache/,

  // Windows EPERM file lock
  /EPERM:.*\.next.*\.tmp/,
];

// Port conflict pattern (handled separately)
const PORT_PATTERN = /EADDRINUSE.*(?:::|:)(\d+)/;

// Module not found patterns (for auto-install)
const MODULE_PATTERNS = [
  /Cannot find module '([^']+)'/,
  /Module not found: Can't resolve '([^']+)'/,
  /Error: Cannot find package '([^']+)'/,
];

// Next.js ready patterns (for browser refresh)
const READY_PATTERNS = [
  /Ready in \d+/,
  /Local:\s+http/,
  /started server on/i,
];

function detectPM(cwd = process.cwd()) {
  const fs = require('fs');
  const path = require('path');

  // 1. Check lockfile first
  if (fs.existsSync(path.join(cwd, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(cwd, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(cwd, 'bun.lockb'))) return 'bun';
  if (fs.existsSync(path.join(cwd, 'package-lock.json'))) return 'npm';

  // 2. Fallback to user agent (how it was executed)
  const ua = process.env.npm_config_user_agent || '';
  if (ua.startsWith('pnpm')) return 'pnpm';
  if (ua.startsWith('yarn')) return 'yarn';
  if (ua.startsWith('bun')) return 'bun';
  return 'npm';
}

function matchError(text) {
  return PATTERNS.some((p) => p.test(text));
}

function matchPortError(text) {
  return PORT_PATTERN.test(text);
}

function extractPort(text) {
  const match = text.match(PORT_PATTERN);
  return match ? parseInt(match[1], 10) : null;
}

function matchModuleError(text) {
  return MODULE_PATTERNS.some((p) => p.test(text));
}

function extractMissingModule(text) {
  for (const pattern of MODULE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      // Return the module name (first capture group)
      return match[1];
    }
  }
  return null;
}

function matchReady(text) {
  return READY_PATTERNS.some((p) => p.test(text));
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

module.exports = {
  PATTERNS,
  PORT_PATTERN,
  MODULE_PATTERNS,
  READY_PATTERNS,
  detectPM,
  matchError,
  matchPortError,
  extractPort,
  matchModuleError,
  extractMissingModule,
  matchReady,
  parseArgs,
  buildArgs,
};
