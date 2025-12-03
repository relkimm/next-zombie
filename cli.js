#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');
const pc = require('picocolors');
const { detectPackageManager, matchesErrorPattern, parseArgs, buildRunArgs } = require('./lib');

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  LOG_TAG: pc.magenta('[next-zombie]'),
  NEXT_DIR: path.join(process.cwd(), '.next'),
  RESTART_DELAY: 1500, // ms to wait before restart (debounce)
  RESTART_INTERVAL: 500, // ms between restart cycles
};

// ============================================================================
// State
// ============================================================================

let restartTimer = null;
let childProcess = null;

// ============================================================================
// Utilities
// ============================================================================

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
  const { script, extraArgs } = parseArgs(args);
  const runArgs = buildRunArgs(script, extraArgs);

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
