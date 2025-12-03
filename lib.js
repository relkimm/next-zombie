const PATTERNS = [
  /_buildManifest\.js\.tmp/,
  /ENOENT:.*\.next/,
];

function detectPM(ua = process.env.npm_config_user_agent || '') {
  if (ua.startsWith('pnpm')) return 'pnpm';
  if (ua.startsWith('yarn')) return 'yarn';
  if (ua.startsWith('bun')) return 'bun';
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
