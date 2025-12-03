#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');
const pc = require('picocolors');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  LOG_TAG: pc.magenta('[next-zombie]'),
  NEXT_DIR: path.join(process.cwd(), '.next'),
  RESTART_DELAY: 1500, // ms to wait before restart (debounce)
  RESTART_INTERVAL: 500, // ms between restart cycles
};

// Patterns that trigger auto-restart (Next.js cache corruption errors)
const ERROR_PATTERNS = [
  /_buildManifest\.js\.tmp/,
  /ENOENT:.*\.next/,
];

// ============================================================================
// State
// ============================================================================

let restartTimer = null;
let childProcess = null;

// ============================================================================
// Utilities
// ============================================================================

/**
 * Detect package manager from npm_config_user_agent
 */
function detectPackageManager() {
  const ua = process.env.npm_config_user_agent || '';
  if (ua.startsWith('pnpm')) return 'pnpm';
  if (ua.startsWith('yarn')) return 'yarn';
  if (ua.startsWith('bun')) return 'bun';
  return 'npm';
}

/**
 * Remove .next directory to clear corrupted cache
 */
function clearNextCache() {
  if (!fs.existsSync(CONFIG.NEXT_DIR)) return;

  try {
    log(pc.dim('Cleaning .next cache...'));
    fs.rmSync(CONFIG.NEXT_DIR, { recursive: true, force: true });
  } catch {
    // Ignore errors - cache will be rebuilt anyway
  }
}

/**
 * Check if text contains any error pattern
 */
function matchesErrorPattern(text) {
  return ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Log with tag prefix
 */
function log(message) {
  console.log(`${CONFIG.LOG_TAG} ${message}`);
}

// ============================================================================
// Restart Logic
// ============================================================================

/**
 * Schedule a debounced restart
 * Multiple errors in quick succession only trigger one restart
 */
function scheduleRestart() {
  if (restartTimer) return;

  log(pc.red('Cache error detected!'));
  log(pc.yellow(`Restarting in ${CONFIG.RESTART_DELAY / 1000}s...`));

  restartTimer = setTimeout(() => {
    restartTimer = null;
    childProcess?.kill('SIGTERM');
  }, CONFIG.RESTART_DELAY);
}

/**
 * Handle process exit and restart if needed
 */
function handleExit(code, signal) {
  childProcess = null;

  // If restart was scheduled (error detected), proceed with restart
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
    log(pc.yellow('Restarting...'));
    clearNextCache();
    setTimeout(start, CONFIG.RESTART_INTERVAL);
    return;
  }

  // Clean exit via Ctrl+C
  if (code === 0 || signal === 'SIGINT') {
    process.exit(0);
  }

  // Crash or forced restart
  if (code !== null && code !== 0) {
    log(pc.red(`Crashed with exit code ${code}`));
  }

  log(pc.yellow('Restarting...'));
  clearNextCache();

  setTimeout(start, CONFIG.RESTART_INTERVAL);
}

// ============================================================================
// Main
// ============================================================================

/**
 * Start Next.js dev server with output monitoring
 */
function start() {
  const pm = detectPackageManager();
  const args = process.argv.slice(2);

  // Parse script name and extra arguments
  const script = args[0] && !args[0].startsWith('-') ? args[0] : 'dev';
  const extraArgs = args[0] && !args[0].startsWith('-') ? args.slice(1) : args;

  // Build command: npm run dev -- --port 3001
  const runArgs = ['run', script];
  if (extraArgs.length > 0) {
    runArgs.push('--', ...extraArgs);
  }

  log(pc.green('Starting Next.js with auto-recovery...'));
  log(pc.dim(`$ ${pm} ${runArgs.join(' ')}\n`));

  // Spawn with piped output for monitoring
  childProcess = spawn(pm, runArgs, {
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  // Monitor stdout/stderr for error patterns
  const monitor = (stream, target) => {
    stream.on('data', (data) => {
      const text = data.toString();
      target.write(text);
      if (matchesErrorPattern(text)) scheduleRestart();
    });
  };

  monitor(childProcess.stdout, process.stdout);
  monitor(childProcess.stderr, process.stderr);
  childProcess.on('exit', handleExit);
}

/**
 * Cleanup on Ctrl+C
 */
process.on('SIGINT', () => {
  if (restartTimer) clearTimeout(restartTimer);
  childProcess?.kill('SIGINT');
  process.exit(0);
});

// ============================================================================
// Entry Point
// ============================================================================

clearNextCache();
start();
