// Patterns that trigger auto-restart (Next.js cache corruption errors)
const ERROR_PATTERNS = [
  /_buildManifest\.js\.tmp/,
  /ENOENT:.*\.next/,
];

/**
 * Detect package manager from npm_config_user_agent
 */
function detectPackageManager(userAgent = process.env.npm_config_user_agent || '') {
  if (userAgent.startsWith('pnpm')) return 'pnpm';
  if (userAgent.startsWith('yarn')) return 'yarn';
  if (userAgent.startsWith('bun')) return 'bun';
  return 'npm';
}

/**
 * Check if text contains any error pattern
 */
function matchesErrorPattern(text) {
  return ERROR_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Parse CLI arguments to extract script name and extra args
 */
function parseArgs(args) {
  const script = args[0] && !args[0].startsWith('-') ? args[0] : 'dev';
  const extraArgs = args[0] && !args[0].startsWith('-') ? args.slice(1) : args;
  return { script, extraArgs };
}

/**
 * Build run arguments for package manager
 */
function buildRunArgs(script, extraArgs) {
  const runArgs = ['run', script];
  if (extraArgs.length > 0) {
    runArgs.push('--', ...extraArgs);
  }
  return runArgs;
}

module.exports = {
  ERROR_PATTERNS,
  detectPackageManager,
  matchesErrorPattern,
  parseArgs,
  buildRunArgs,
};
