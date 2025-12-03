import { describe, it, expect } from 'vitest';
import {
  ERROR_PATTERNS,
  detectPackageManager,
  matchesErrorPattern,
  parseArgs,
  buildRunArgs,
} from './lib.js';

describe('detectPackageManager', () => {
  it('should detect npm (default)', () => {
    expect(detectPackageManager('')).toBe('npm');
    expect(detectPackageManager(undefined)).toBe('npm');
  });

  it('should detect pnpm', () => {
    expect(detectPackageManager('pnpm/8.0.0 npm/? node/v18.0.0')).toBe('pnpm');
  });

  it('should detect yarn', () => {
    expect(detectPackageManager('yarn/1.22.0 npm/? node/v18.0.0')).toBe('yarn');
  });

  it('should detect bun', () => {
    expect(detectPackageManager('bun/1.0.0')).toBe('bun');
  });
});

describe('matchesErrorPattern', () => {
  it('should match _buildManifest.js.tmp errors', () => {
    const error = "Error: ENOENT: no such file or directory, open '.next/static/development/_buildManifest.js.tmp'";
    expect(matchesErrorPattern(error)).toBe(true);
  });

  it('should match ENOENT .next errors', () => {
    const error = "ENOENT: no such file or directory, open '/path/.next/server/app/page.js'";
    expect(matchesErrorPattern(error)).toBe(true);
  });

  it('should match app-build-manifest.json errors', () => {
    const error = "[Error: ENOENT: no such file or directory, open '/Users/donggu/Desktop/workspace/artcenter/artcenter-admin/.next/server/app/(dashboard)/(private)/dashboard/page/app-build-manifest.json']";
    expect(matchesErrorPattern(error)).toBe(true);
  });

  it('should not match unrelated errors', () => {
    expect(matchesErrorPattern('SyntaxError: Unexpected token')).toBe(false);
    expect(matchesErrorPattern('TypeError: Cannot read property')).toBe(false);
    expect(matchesErrorPattern('ENOENT: /some/other/path')).toBe(false);
  });

  it('should not match normal log messages', () => {
    expect(matchesErrorPattern('GET /api/users 200 in 50ms')).toBe(false);
    expect(matchesErrorPattern('Compiled successfully')).toBe(false);
  });
});

describe('parseArgs', () => {
  it('should default to dev script when no args', () => {
    const result = parseArgs([]);
    expect(result.script).toBe('dev');
    expect(result.extraArgs).toEqual([]);
  });

  it('should use first arg as script if not starting with -', () => {
    const result = parseArgs(['build']);
    expect(result.script).toBe('build');
    expect(result.extraArgs).toEqual([]);
  });

  it('should pass through extra args after script', () => {
    const result = parseArgs(['dev', '--port', '3001']);
    expect(result.script).toBe('dev');
    expect(result.extraArgs).toEqual(['--port', '3001']);
  });

  it('should treat args starting with - as extra args', () => {
    const result = parseArgs(['--port', '3001']);
    expect(result.script).toBe('dev');
    expect(result.extraArgs).toEqual(['--port', '3001']);
  });
});

describe('buildRunArgs', () => {
  it('should build basic run command', () => {
    const result = buildRunArgs('dev', []);
    expect(result).toEqual(['run', 'dev']);
  });

  it('should add -- separator for extra args', () => {
    const result = buildRunArgs('dev', ['--port', '3001']);
    expect(result).toEqual(['run', 'dev', '--', '--port', '3001']);
  });

  it('should work with different scripts', () => {
    const result = buildRunArgs('build', []);
    expect(result).toEqual(['run', 'build']);
  });
});

describe('ERROR_PATTERNS', () => {
  it('should have patterns for common Next.js cache errors', () => {
    expect(ERROR_PATTERNS.length).toBeGreaterThan(0);
  });

  it('should include _buildManifest.js.tmp pattern', () => {
    const hasPattern = ERROR_PATTERNS.some(p => p.test('_buildManifest.js.tmp'));
    expect(hasPattern).toBe(true);
  });

  it('should include ENOENT .next pattern', () => {
    const hasPattern = ERROR_PATTERNS.some(p => p.test('ENOENT: .next/something'));
    expect(hasPattern).toBe(true);
  });
});
