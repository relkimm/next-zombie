import { describe, it, expect } from 'vitest';
import { PATTERNS, detectPM, matchError, parseArgs, buildArgs } from './lib.js';

describe('detectPM', () => {
  it('should detect npm (default)', () => {
    expect(detectPM('')).toBe('npm');
    expect(detectPM(undefined)).toBe('npm');
  });

  it('should detect pnpm', () => {
    expect(detectPM('pnpm/8.0.0 npm/? node/v18.0.0')).toBe('pnpm');
  });

  it('should detect yarn', () => {
    expect(detectPM('yarn/1.22.0 npm/? node/v18.0.0')).toBe('yarn');
  });

  it('should detect bun', () => {
    expect(detectPM('bun/1.0.0')).toBe('bun');
  });
});

describe('matchError', () => {
  it('should match _buildManifest.js.tmp errors', () => {
    const error = "Error: ENOENT: no such file or directory, open '.next/static/development/_buildManifest.js.tmp'";
    expect(matchError(error)).toBe(true);
  });

  it('should match ENOENT .next errors', () => {
    const error = "ENOENT: no such file or directory, open '/path/.next/server/app/page.js'";
    expect(matchError(error)).toBe(true);
  });

  it('should match app-build-manifest.json errors', () => {
    const error = "[Error: ENOENT: no such file or directory, open '/Users/donggu/.next/server/app/page/app-build-manifest.json']";
    expect(matchError(error)).toBe(true);
  });

  it('should not match unrelated errors', () => {
    expect(matchError('SyntaxError: Unexpected token')).toBe(false);
    expect(matchError('TypeError: Cannot read property')).toBe(false);
    expect(matchError('ENOENT: /some/other/path')).toBe(false);
  });

  it('should not match normal log messages', () => {
    expect(matchError('GET /api/users 200 in 50ms')).toBe(false);
    expect(matchError('Compiled successfully')).toBe(false);
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
  it('should have patterns for common Next.js cache errors', () => {
    expect(PATTERNS.length).toBeGreaterThan(0);
  });

  it('should include _buildManifest.js.tmp pattern', () => {
    expect(PATTERNS.some(p => p.test('_buildManifest.js.tmp'))).toBe(true);
  });

  it('should include ENOENT .next pattern', () => {
    expect(PATTERNS.some(p => p.test('ENOENT: .next/something'))).toBe(true);
  });
});
