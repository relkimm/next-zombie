#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const spawn = require('cross-spawn');
const pc = require('picocolors');

// --- Config ---
const LOG_TAG = pc.magenta('[next-zombie]'); // Brand color
const NEXT_DIR = path.join(process.cwd(), '.next');

// --- Helper Functions ---

// 1. Detect user's package manager
function getPackageManager() {
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.startsWith('pnpm')) return 'pnpm';
  if (userAgent.startsWith('yarn')) return 'yarn';
  if (userAgent.startsWith('bun')) return 'bun';
  return 'npm';
}

// 2. Safely clean the .next cache folder
function cleanCache() {
  if (fs.existsSync(NEXT_DIR)) {
    try {
      // Dimmed log for background tasks
      console.log(`${LOG_TAG} ${pc.dim('Cleaning .next build cache...')}`);
      fs.rmSync(NEXT_DIR, { recursive: true, force: true });
    } catch (e) {
      // Fail silently or log if needed, but don't stop the process
    }
  }
}

// --- Main Logic ---

function start() {
  const pm = getPackageManager();
  const args = process.argv.slice(2);

  // Default to 'dev' script, follows user's package.json scripts
  // e.g., if package.json has "dev": "next dev --turbopack", it runs that
  const script = args[0] && !args[0].startsWith('-') ? args[0] : 'dev';
  const extraArgs = args[0] && !args[0].startsWith('-') ? args.slice(1) : args;

  // Build command: npm run dev -- --port 3001
  const runArgs = ['run', script];
  if (extraArgs.length > 0) {
    runArgs.push('--', ...extraArgs);
  }

  console.log(`${LOG_TAG} ${pc.green('Starting Next.js with auto-recovery...')}`);
  console.log(`${LOG_TAG} ${pc.dim(`Running: ${pm} ${runArgs.join(' ')}`)}\n`);

  const child = spawn(pm, runArgs, {
    stdio: 'inherit', // Preserve colors and interactions
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  child.on('exit', (code) => {
    // 0 = Success, null = Killed by signal (e.g., Ctrl+C)
    if (code === 0 || code === null) {
      process.exit(0);
      return;
    }

    // If exit code is NOT 0, it means it crashed
    console.log(`\n${LOG_TAG} ${pc.red(`Server crashed! (Exit Code: ${code})`)}`);
    console.log(`${LOG_TAG} ${pc.yellow('Restarting in 1s...')}`);

    cleanCache();

    setTimeout(() => {
      // Optional: console.clear();
      start();
    }, 1000);
  });

  // Handle Ctrl+C (Graceful Shutdown)
  // Prevents the zombie process from staying alive when you actually want to quit
  process.on('SIGINT', () => {
    child.kill('SIGINT');
    process.exit(0);
  });
}

// Start the process
cleanCache(); // Ensure fresh start
start();
