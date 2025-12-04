import { describe, it, expect } from 'vitest';
import { PATTERNS, detectPM, matchError, parseArgs, buildArgs } from './lib.js';

describe('detectPM', () => {
  it('should return npm as default', () => {
    expect(detectPM('/nonexistent')).toBe('npm');
  });
});

describe('matchError', () => {
  // Cache temp file errors
  it('should match _buildManifest.js.tmp errors', () => {
    const error = "Error: ENOENT: no such file or directory, open '.next/static/development/_buildManifest.js.tmp'";
    expect(matchError(error)).toBe(true);
  });

  it('should match build-manifest.json.tmp errors', () => {
    const error = "EPERM: operation not permitted, rename '.next/build-manifest.json.tmp' -> '.next/build-manifest.json'";
    expect(matchError(error)).toBe(true);
  });

  it('should match _devMiddlewareManifest errors', () => {
    const error = "Error: ENOENT: no such file or directory '_devMiddlewareManifest.json'";
    expect(matchError(error)).toBe(true);
  });

  // Turbopack panic errors
  it('should match FATAL Turbopack error', () => {
    const error = "FATAL: An unexpected Turbopack error occurred. Please report the content of /tmp/next-panic.log";
    expect(matchError(error)).toBe(true);
  });

  it('should match Rust panic errors', () => {
    expect(matchError("thread caused non-unwinding panic. aborting.")).toBe(true);
    expect(matchError("panicked at turbopack/crates/turbopack-core/src/module.rs:42")).toBe(true);
  });

  // Specific cache directory ENOENT
  it('should match .next/static/development ENOENT', () => {
    const error = "ENOENT: no such file or directory, open '.next/static/development/something.js'";
    expect(matchError(error)).toBe(true);
  });

  it('should match .next/cache ENOENT', () => {
    const error = "ENOENT: no such file or directory '.next/cache/webpack/client-development/0.pack'";
    expect(matchError(error)).toBe(true);
  });

  // Windows EPERM
  it('should match Windows EPERM tmp file errors', () => {
    const error = "EPERM: operation not permitted, rename '.next\\server\\app-paths-manifest.json.tmp'";
    expect(matchError(error)).toBe(true);
  });

  // Should NOT match user code errors
  it('should not match user code errors', () => {
    expect(matchError('SyntaxError: Unexpected token')).toBe(false);
    expect(matchError('TypeError: Cannot read property')).toBe(false);
    expect(matchError('ReferenceError: foo is not defined')).toBe(false);
  });

  it('should not match user file ENOENT errors', () => {
    // User trying to read a file that doesn't exist
    expect(matchError('ENOENT: /some/other/path')).toBe(false);
    expect(matchError("ENOENT: no such file or directory './src/data.json'")).toBe(false);
    // .next/server is NOT a cache dir we restart for
    expect(matchError("ENOENT: no such file or directory '.next/server/app/page.js'")).toBe(false);
  });

  it('should not match module not found errors', () => {
    expect(matchError("Module not found: Can't resolve './components/Foo'")).toBe(false);
  });

  it('should not match normal log messages', () => {
    expect(matchError('GET /api/users 200 in 50ms')).toBe(false);
    expect(matchError('Compiled successfully')).toBe(false);
    expect(matchError('Ready in 1.5s')).toBe(false);
  });
});

describe('parseArgs', () => {
  it('should default to dev script when no args', () => {
    const result = parseArgs([]);
    expect(result.script).toBe('dev');
    expect(result.extra).toEqual([]);
  });

  it('should use first arg as script if not starting with -', () => {
    const result = parseArgs(['build']);
    expect(result.script).toBe('build');
    expect(result.extra).toEqual([]);
  });

  it('should pass through extra args after script', () => {
    const result = parseArgs(['dev', '--port', '3001']);
    expect(result.script).toBe('dev');
    expect(result.extra).toEqual(['--port', '3001']);
  });

  it('should treat args starting with - as extra args', () => {
    const result = parseArgs(['--port', '3001']);
    expect(result.script).toBe('dev');
    expect(result.extra).toEqual(['--port', '3001']);
  });
});

describe('buildArgs', () => {
  it('should build basic run command', () => {
    expect(buildArgs('dev', [])).toEqual(['run', 'dev']);
  });

  it('should add -- separator for extra args', () => {
    expect(buildArgs('dev', ['--port', '3001'])).toEqual(['run', 'dev', '--', '--port', '3001']);
  });

  it('should work with different scripts', () => {
    expect(buildArgs('build', [])).toEqual(['run', 'build']);
  });
});

describe('PATTERNS', () => {
  it('should have patterns for Turbopack cache/panic errors', () => {
    expect(PATTERNS.length).toBeGreaterThanOrEqual(9);
  });

  it('should include cache temp file patterns', () => {
    expect(PATTERNS.some(p => p.test('_buildManifest.js.tmp'))).toBe(true);
    expect(PATTERNS.some(p => p.test('build-manifest.json.tmp'))).toBe(true);
    expect(PATTERNS.some(p => p.test('_devMiddlewareManifest'))).toBe(true);
  });

  it('should include Turbopack panic patterns', () => {
    expect(PATTERNS.some(p => p.test('FATAL: An unexpected Turbopack error occurred'))).toBe(true);
    expect(PATTERNS.some(p => p.test('panicked at turbopack/crates/foo.rs'))).toBe(true);
  });

  it('should include specific cache directory ENOENT patterns', () => {
    expect(PATTERNS.some(p => p.test('ENOENT: .next/static/development/foo.js'))).toBe(true);
    expect(PATTERNS.some(p => p.test('ENOENT: .next/cache/webpack/pack.gz'))).toBe(true);
  });
});
