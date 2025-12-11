/**
 * Error patterns that trigger auto-restart.
 * Only matches Turbopack internal errors, not user code errors.
 */
export const PATTERNS: RegExp[];

/**
 * Pattern for detecting port conflict errors (EADDRINUSE).
 */
export const PORT_PATTERN: RegExp;

/**
 * Patterns for detecting missing module errors.
 */
export const MODULE_PATTERNS: RegExp[];

/**
 * Patterns for detecting Next.js server ready state.
 */
export const READY_PATTERNS: RegExp[];

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
 * Tests if text contains a port conflict error (EADDRINUSE).
 * @param text - Text to check
 * @returns true if port conflict detected
 */
export function matchPortError(text: string): boolean;

/**
 * Extracts the port number from an EADDRINUSE error message.
 * @param text - Error text containing port info
 * @returns Port number or null if not found
 */
export function extractPort(text: string): number | null;

/**
 * Tests if text contains a missing module error.
 * @param text - Text to check
 * @returns true if module error detected
 *
 * @example
 * ```ts
 * matchModuleError("Cannot find module 'lodash'") // true
 * matchModuleError("Module not found: Can't resolve 'axios'") // true
 * matchModuleError("SyntaxError: ...") // false
 * ```
 */
export function matchModuleError(text: string): boolean;

/**
 * Extracts the missing module name from an error message.
 * @param text - Error text containing module info
 * @returns Module name or null if not found
 *
 * @example
 * ```ts
 * extractMissingModule("Cannot find module 'lodash'") // 'lodash'
 * extractMissingModule("Module not found: Can't resolve '@tanstack/react-query'") // '@tanstack/react-query'
 * ```
 */
export function extractMissingModule(text: string): string | null;

/**
 * Tests if text indicates Next.js server is ready.
 * @param text - Text to check
 * @returns true if server ready message detected
 *
 * @example
 * ```ts
 * matchReady('Ready in 1.5s') // true
 * matchReady('Local: http://localhost:3000') // true
 * matchReady('Compiling...') // false
 * ```
 */
export function matchReady(text: string): boolean;

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
