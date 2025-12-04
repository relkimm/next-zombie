# next-zombie 🧟

> **Fix "ENOENT _buildManifest.js.tmp" error automatically**
>
> Turbopack crash recovery | Next.js 15 dev server auto-restart

[![npm version](https://img.shields.io/npm/v/next-zombie.svg)](https://www.npmjs.com/package/next-zombie)
[![npm downloads](https://img.shields.io/npm/dm/next-zombie.svg)](https://www.npmjs.com/package/next-zombie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**Turbopack is fast. But it crashes.** Cache corruption, `_buildManifest.js.tmp` errors, random ENOENT failures — sound familiar?

**next-zombie** watches your Next.js dev server and automatically restarts it when Turbopack crashes. No more manual restarts. No more `rm -rf .next`. Just keep coding.

<!-- Keywords for SEO: next.js turbopack crash, ENOENT _buildManifest.js.tmp, next.js 15 cache error, turbopack auto restart, next.js dev server crash fix -->

## The Problem

Next.js 15 + Turbopack is blazing fast, but unstable:

```
⨯ [Error: ENOENT: no such file or directory, open '.next/static/development/_buildManifest.js.tmp']
```

You have two choices:
1. **Disable Turbopack** — Stable but slower
2. **Use next-zombie** — Keep Turbopack speed + auto-recovery

## Quick Start

```bash
npx next-zombie
```

That's it. Your dev server now auto-recovers from crashes.

## Install

```bash
npm install -D next-zombie
# or
pnpm add -D next-zombie
# or
yarn add -D next-zombie
```

Add to `package.json`:

```json
{
  "scripts": {
    "dev": "next-zombie"
  }
}
```

## Features

| Feature | Description |
|---------|-------------|
| **Auto-Recovery** | Detects crashes and restarts in ~700ms |
| **Cache Cleanup** | Clears `.next` before restart |
| **Smart PM Detection** | Detects npm/pnpm/yarn/bun from lockfile |
| **Cross-Platform** | Works on macOS, Linux, and Windows |
| **Desktop Notifications** | Get notified when server restarts |
| **Session Report** | Detailed stats with error breakdown on exit |
| **Zero Config** | Works with your existing `dev` script |

## How It Works

```
next-zombie
    │
    ├─► Clean .next cache
    │
    ├─► Start: pnpm run dev
    │
    ├─► Monitor stdout/stderr
    │       │
    │       ├─► Cache error detected?
    │       │       │
    │       │       └─► Kill process tree
    │       │           └─► Restart (after 500ms)
    │       │
    │       └─► Process crashed?
    │               │
    │               └─► Restart (after 200ms)
    │
    └─► Ctrl+C → Clean exit
```

## Detected Errors

next-zombie auto-restarts on Turbopack internal errors only (not user code errors):

**Cache temp file corruption:**
- `_buildManifest.js.tmp` ENOENT
- `build-manifest.json.tmp` EPERM
- `_devMiddlewareManifest` errors

**Turbopack panics:**
- `FATAL: An unexpected Turbopack error occurred`
- Rust panic messages (`panicked at turbopack/...`)

**Cache directory errors:**
- `.next/static/development/` ENOENT
- `.next/cache/` ENOENT
- Windows EPERM on `.tmp` files

**NOT restarted (user code errors):**
- `SyntaxError`, `TypeError`, `ReferenceError`
- `Module not found` errors
- API/runtime errors

## Usage

```bash
# Default: runs 'dev' script
next-zombie

# Custom script
next-zombie start

# With arguments
next-zombie dev --port 3001

# Disable notifications
next-zombie --no-notify

# Keep .next cache (don't clear on restart)
next-zombie --no-clear
```

## Options

| Option | Description |
|--------|-------------|
| `--no-notify` | Disable desktop notifications |
| `--no-clear` | Don't clear `.next` cache on restart |
| `-h, --help` | Show help message |
| `-V, --version` | Show version number |

## Package Manager Detection

next-zombie detects your package manager automatically:

1. **Lockfile** (priority): `pnpm-lock.yaml` → pnpm
2. **Fallback**: How you ran it (`npx` → npm)

So even with `npx next-zombie`, it runs `pnpm run dev` if you have `pnpm-lock.yaml`.

## Session Report

On exit (Ctrl+C), next-zombie shows a detailed session report:

```
┌─────────────────────────────────────────┐
│  📊 Session Report                      │
├─────────────────────────────────────────┤
│  Uptime:    2h 15m                      │
│  Restarts:  7                           │
│  Avg interval: 19m                      │
├─────────────────────────────────────────┤
│  Errors:                                │
│  • buildManifest.tmp          (5x)      │
│  • FATAL Turbopack            (2x)      │
└─────────────────────────────────────────┘

💡 Tip: Frequent crashes may indicate Turbopack instability.
   Try: next dev --turbo=false (use Webpack instead)
```

The report includes:
- Total uptime and restart count
- Average time between crashes
- Error breakdown by type (top 5)
- Helpful tips based on error patterns

## Requirements

- Node.js >= 18.0.0
- Next.js project

## Contributing

Found a new error pattern that should trigger auto-restart? [Open an issue](https://github.com/relkimm/next-zombie/issues/new?template=error_pattern.md)!

## FAQ

**Q: Does this fix the Turbopack bugs?**

No. It's a workaround. When Turbopack crashes, next-zombie restarts your server automatically so you don't have to.

**Q: Should I use this in production?**

No. This is for development only. Production builds (`next build`) don't have this issue.

**Q: Why not just disable Turbopack?**

You can! But Turbopack is significantly faster. next-zombie lets you keep that speed while handling the occasional crash.

## License

MIT © [relkimm](https://github.com/relkimm)
