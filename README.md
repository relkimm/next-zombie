# next-zombie 🧟

> **Fix "ENOENT _buildManifest.js.tmp" error automatically**
>
> Turbopack crash recovery | Auto-restart for Next.js 13.4+

[![npm version](https://img.shields.io/npm/v/next-zombie.svg)](https://www.npmjs.com/package/next-zombie)
[![npm downloads](https://img.shields.io/npm/dm/next-zombie.svg)](https://www.npmjs.com/package/next-zombie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org/)

**Turbopack is fast. But it crashes.** Cache corruption, `_buildManifest.js.tmp` errors, random ENOENT failures — sound familiar?

**next-zombie** watches your Next.js dev server and automatically restarts it when Turbopack crashes. No more manual restarts. No more `rm -rf .next`. Just keep coding.

**Works with Next.js 13.4+ using Turbopack** (especially useful in 15+ where Turbopack is default)

<!-- Keywords for SEO: next.js turbopack crash, ENOENT _buildManifest.js.tmp, next.js cache error, turbopack auto restart, next.js dev server crash fix, next.js 13 14 15 16 -->

## The Problem

Turbopack (Next.js 13.4+) is blazing fast, but unstable:

```
⨯ [Error: ENOENT: no such file or directory, open '.next/static/development/_buildManifest.js.tmp']
```

**When does this happen?**
- Next.js 13.4-14.x with `--turbo` flag
- Next.js 15+ (Turbopack is default)
- Next.js 16+ (same Turbopack issues)

**Your choices:**
1. **Disable Turbopack** — Stable but slower (`next dev --turbo=false`)
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
| **Browser Auto-Refresh** | Automatically refreshes browser after restart |
| **Auto Install** | Fixes missing modules with automatic npm install |
| **Port Conflict Resolution** | Automatically finds next available port |
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

## Port Conflict Resolution

When port 3000 (or any port) is already in use, next-zombie automatically tries the next port:

```
Error: listen EADDRINUSE: address already in use :::3000

[next-zombie] Port 3000 in use
[next-zombie] Trying port 3001...
[next-zombie] Starting Next.js dev server on port 3001...
```

No more manually killing processes or adding `--port` flags!

## Browser Auto-Refresh

After a restart, your browser automatically refreshes when the server is ready. No more pressing F5!

**Setup (one-time):** Run this in your browser console:

```javascript
new WebSocket("ws://localhost:35729").onmessage=()=>location.reload()
```

Or add this bookmarklet and click it once:

```
javascript:(function(){new WebSocket("ws://localhost:35729").onmessage=()=>location.reload()})()
```

The WebSocket connection auto-reconnects, so you only need to set this up once per browser session.

## Auto Install

Missing a module? next-zombie automatically runs `npm install` and restarts:

```
Module not found: Can't resolve 'lodash'

[next-zombie] Missing module: lodash
[next-zombie] Running npm install...
[next-zombie] Install completed
[next-zombie] Restarting...
```

This catches:
- `Cannot find module 'xxx'`
- `Module not found: Can't resolve 'xxx'`
- `Cannot find package 'xxx'`

To disable: `next-zombie --no-auto-install`

## Usage

```bash
# Default: runs 'dev' script
next-zombie

# Custom script
next-zombie start

# With arguments
next-zombie dev --port 3001

# Disable auto browser refresh
next-zombie --no-refresh

# Disable auto install
next-zombie --no-auto-install

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
| `--no-refresh` | Disable auto browser refresh |
| `--no-auto-install` | Disable auto npm install on module errors |
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

**Q: Which Next.js versions are supported?**

Next.js 13.4+ with Turbopack enabled. This includes:
- **13.4-14.x**: When using `next dev --turbo`
- **15.x+**: Turbopack is default (most useful here)
- **16.x+**: Same Turbopack issues, same solution

If you're not using Turbopack (`--turbo=false`), you don't need this tool.

**Q: Does this fix the Turbopack bugs?**

No. It's a workaround. When Turbopack crashes, next-zombie restarts your server automatically so you don't have to.

**Q: Should I use this in production?**

No. This is for development only. Production builds (`next build`) don't have this issue.

**Q: Why not just disable Turbopack?**

You can! But Turbopack is significantly faster. next-zombie lets you keep that speed while handling the occasional crash.

## License

MIT © [relkimm](https://github.com/relkimm)
