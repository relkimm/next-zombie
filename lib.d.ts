/**
 * Error patterns that trigger auto-restart.
 * Only matches Turbopack internal errors, not user code errors.
 */
export const PATTERNS: RegExp[];

/**
 * Detects the package manager from lockfile.
 * @param cwd - Working directory to check (defaults to process.cwd())
 * @returns Detected package manager
 *
 * @example
 * ```ts
 * detectPM() // 'pnpm' if pnpm-lock.yaml exists
 * detectPM('/path/to/project') // Check specific directory
 * ```
 */
export function detectPM(cwd?: string): 'npm' | 'pnpm' | 'yarn' | 'bun';

/**
 * Tests if text matches any Turbopack error pattern.
 * @param text - Text to check (usually stdout/stderr output)
 * @returns true if text matches a known error pattern
 *
 * @example
 * ```ts
 * matchError('ENOENT: .next/cache/foo') // true
 * matchError('SyntaxError: ...') // false (user code error)
 * ```
 */
export function matchError(text: string): boolean;

/**
 * Parsed CLI arguments.
 */
export interface ParsedArgs {
  /** Script name to run (defaults to 'dev') */
  script: string;
  /** Extra arguments to pass to the script */
  extra: string[];
}

/**
 * Parses CLI arguments into script name and extra args.
 * @param args - CLI arguments (without node and script path)
 * @returns Parsed arguments object
 *
 * @example
 * ```ts
 * parseArgs([]) // { script: 'dev', extra: [] }
 * parseArgs(['build']) // { script: 'build', extra: [] }
 * parseArgs(['dev', '--port', '3001']) // { script: 'dev', extra: ['--port', '3001'] }
 * ```
 */
export function parseArgs(args: string[]): ParsedArgs;

/**
 * Builds command arguments for spawn.
 * @param script - Script name to run
 * @param extra - Extra arguments to pass
 * @returns Array of arguments for spawn
 *
 * @example
 * ```ts
 * buildArgs('dev', []) // ['run', 'dev']
 * buildArgs('dev', ['--port', '3001']) // ['run', 'dev', '--', '--port', '3001']
 * ```
 */
export function buildArgs(script: string, extra: string[]): string[];
