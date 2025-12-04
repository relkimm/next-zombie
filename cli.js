#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');
const pc = require('picocolors');
const treeKill = require('tree-kill');
const notifier = require('node-notifier');
const { PATTERNS, detectPM, matchError, matchPortError, extractPort, parseArgs, buildArgs } = require('./lib');
const pkg = require('./package.json');

// Error pattern labels for reporting
const PATTERN_LABELS = [
  'buildManifest.tmp',
  'build-manifest.tmp',
  'devMiddlewareManifest',
  'FATAL Turbopack',
  'Rust panic',
  'panicked at turbopack',
  'ENOENT static/development',
  'ENOENT cache',
  'EPERM tmp file',
];

// Parse CLI options
const args = process.argv.slice(2);
const options = {
  help: args.includes('--help') || args.includes('-h'),
  version: args.includes('--version') || args.includes('-V'),
  noNotify: args.includes('--no-notify'),
  noClear: args.includes('--no-clear'),
};

// Filter out our options, pass rest to parseArgs
const scriptArgs = args.filter(
  (a) => !['--help', '-h', '--version', '-V', '--no-notify', '--no-clear'].includes(a)
);

// Handle --help
if (options.help) {
  console.log(`
${pc.magenta('next-zombie')} ${pc.dim(`v${pkg.version}`)}

${pc.cyan('Usage:')}
  next-zombie [script] [options]

${pc.cyan('Options:')}
  ${pc.yellow('--no-notify')}    Disable desktop notifications
  ${pc.yellow('--no-clear')}     Don't clear .next cache on restart
  ${pc.yellow('-h, --help')}     Show this help message
  ${pc.yellow('-V, --version')}  Show version number

${pc.cyan('Examples:')}
  ${pc.dim('$')} next-zombie              ${pc.dim('# Run "dev" script')}
  ${pc.dim('$')} next-zombie start        ${pc.dim('# Run "start" script')}
  ${pc.dim('$')} next-zombie dev -p 3001  ${pc.dim('# Run "dev" with port 3001')}
  ${pc.dim('$')} next-zombie --no-notify  ${pc.dim('# Disable notifications')}

${pc.cyan('Docs:')} ${pc.underline('https://github.com/relkimm/next-zombie')}
`);
  process.exit(0);
}

// Handle --version
if (options.version) {
  console.log(pkg.version);
  process.exit(0);
}

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
const errorCounts = {};  // { patternLabel: count }
const restartTimestamps = [];  // For calculating intervals

// Port fallback
let currentPort = null;
let portConflict = false;

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

function showReport() {
  const uptime = formatUptime(Date.now() - startTime);
  const hasErrors = Object.keys(errorCounts).length > 0;

  console.log('');
  console.log(pc.cyan('┌─────────────────────────────────────────┐'));
  console.log(pc.cyan('│') + pc.bold('  📊 Session Report                      ') + pc.cyan('│'));
  console.log(pc.cyan('├─────────────────────────────────────────┤'));
  console.log(pc.cyan('│') + `  Uptime:    ${pc.green(uptime.padEnd(27))}` + pc.cyan('│'));
  console.log(pc.cyan('│') + `  Restarts:  ${pc.yellow(String(restarts).padEnd(27))}` + pc.cyan('│'));

  // Average interval between crashes
  if (restartTimestamps.length >= 2) {
    let totalInterval = 0;
    for (let i = 1; i < restartTimestamps.length; i++) {
      totalInterval += restartTimestamps[i] - restartTimestamps[i - 1];
    }
    const avgInterval = formatUptime(totalInterval / (restartTimestamps.length - 1));
    console.log(pc.cyan('│') + `  Avg interval: ${pc.dim(avgInterval.padEnd(24))}` + pc.cyan('│'));
  }

  // Error breakdown
  if (hasErrors) {
    console.log(pc.cyan('├─────────────────────────────────────────┤'));
    console.log(pc.cyan('│') + pc.bold('  Errors:                                ') + pc.cyan('│'));

    // Sort by count descending
    const sorted = Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);  // Top 5

    for (const [label, count] of sorted) {
      const countStr = `(${count}x)`;
      const line = `  • ${label}`.padEnd(32) + pc.dim(countStr.padEnd(7));
      console.log(pc.cyan('│') + line + pc.cyan('│'));
    }
  }

  console.log(pc.cyan('└─────────────────────────────────────────┘'));

  // Tip based on errors
  if (hasErrors) {
    const topError = Object.entries(errorCounts).sort((a, b) => b[1] - a[1])[0];
    if (topError && topError[1] >= 3) {
      console.log('');
      console.log(pc.dim('💡 Tip: Frequent crashes may indicate Turbopack instability.'));
      console.log(pc.dim('   Try: next dev --turbo=false (use Webpack instead)'));
    }
  }
  console.log('');
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
  if (options.noClear) return;
  if (!fs.existsSync(CACHE)) return;
  try {
    dim('Clearing .next cache...');
    fs.rmSync(CACHE, { recursive: true, force: true });
  } catch (err) {
    warn(`Failed to clear cache: ${err.message}`);
  }
}

function killChild(callback) {
  if (!child) {
    if (callback) callback();
    return;
  }
  const pid = child.pid;
  treeKill(pid, 'SIGTERM', (err) => {
    if (err) {
      dim(`Tree kill failed: ${err.message}`);
      try {
        child.kill('SIGTERM');
      } catch (killErr) {
        warn(`Failed to kill process: ${killErr.message}`);
      }
    }
    if (callback) callback();
  });
}

function notify(title, message) {
  if (options.noNotify) return;
  notifier.notify({
    title: `🧟 ${title}`,
    message,
    sound: false,
  });
}

function detectErrorType(text) {
  for (let i = 0; i < PATTERNS.length; i++) {
    if (PATTERNS[i].test(text)) {
      return PATTERN_LABELS[i] || `Pattern ${i}`;
    }
  }
  return 'Unknown';
}

function trackError(text) {
  const errorType = detectErrorType(text);
  errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
  restartTimestamps.push(Date.now());
}

function schedulePortRetry(blockedPort) {
  if (pending) return;

  const nextPort = blockedPort + 1;
  warn(`Port ${blockedPort} in use`);
  info(`Trying port ${nextPort}...`);
  notify('Port Conflict', `Switching to port ${nextPort}`);

  currentPort = nextPort;
  portConflict = true;
  errorCounts['Port in use'] = (errorCounts['Port in use'] || 0) + 1;

  pending = true;
  timer = setTimeout(() => {
    timer = null;
    killChild();
  }, DELAY);
}

function schedule(errorText) {
  if (pending) return;

  trackError(errorText);
  error('Cache error detected');
  warn(`Restarting in ${DELAY}ms...`);
  notify('Error Detected', 'Restarting dev server...');

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

    // Port conflict doesn't count as a crash
    if (!portConflict) {
      restarts++;
      if (isCrashLoop()) {
        showReport();
        process.exit(1);
      }
      warn(`Restarting #${restarts}...`);
      clearCache();
    }

    portConflict = false;
    setTimeout(start, INTERVAL);
    return;
  }

  if (code === 0 || signal === 'SIGINT') {
    showReport();
    process.exit(0);
  }

  restarts++;
  if (code !== null && code !== 0) {
    error(`Process crashed with exit code ${code}`);
  }

  if (isCrashLoop()) {
    showReport();
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
  const { script, extra } = parseArgs(scriptArgs);

  if (restarts === 0 && !portConflict) {
    checkScript(script);
  }

  // Add port option if we're retrying due to port conflict
  let finalExtra = [...extra];
  if (currentPort) {
    // Remove any existing port options
    finalExtra = finalExtra.filter((arg, i, arr) => {
      if (arg === '-p' || arg === '--port') {
        arr.splice(i + 1, 1); // Remove next arg too
        return false;
      }
      return !arg.startsWith('--port=') && !arg.startsWith('-p=');
    });
    finalExtra.push('-p', String(currentPort));
  }

  const args = buildArgs(script, finalExtra);

  if (currentPort) {
    success(`Starting Next.js dev server on port ${currentPort}...`);
  } else {
    success('Starting Next.js dev server...');
  }
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

      // Check port conflict first
      if (matchPortError(text)) {
        const blockedPort = extractPort(text);
        if (blockedPort) {
          schedulePortRetry(blockedPort);
          return;
        }
      }

      // Then check cache errors
      if (matchError(text)) schedule(text);
    });
  };

  monitor(child.stdout, process.stdout);
  monitor(child.stderr, process.stderr);
  child.on('exit', onExit);
}

process.on('SIGINT', () => {
  pending = false;
  if (timer) clearTimeout(timer);
  killChild(() => {
    showReport();
    process.exit(0);
  });
});

clearCache();
start();
