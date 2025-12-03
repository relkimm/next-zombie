# next-zombie 🧟

> Your Next.js dev server rises from the dead.

[![npm version](https://img.shields.io/npm/v/next-zombie.svg)](https://www.npmjs.com/package/next-zombie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Turbopack is fast. But it crashes.** Cache corruption, `_buildManifest.js.tmp` errors, random ENOENT failures — sound familiar?

**next-zombie** watches your dev server and automatically restarts it when things go wrong. No more manual restarts. No more deleting `.next`. Just keep coding.

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
| **Process Tree Kill** | Properly kills entire process tree |
| **Session Stats** | Shows restart count and uptime on exit |
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

next-zombie auto-restarts on:

- `_buildManifest.js.tmp` ENOENT errors
- `.next` cache corruption
- Any dev server crash

## Usage

```bash
# Default: runs 'dev' script
next-zombie

# Custom script
next-zombie start

# With arguments
next-zombie dev --port 3001
```

## Package Manager Detection

next-zombie detects your package manager automatically:

1. **Lockfile** (priority): `pnpm-lock.yaml` → pnpm
2. **Fallback**: How you ran it (`npx` → npm)

So even with `npx next-zombie`, it runs `pnpm run dev` if you have `pnpm-lock.yaml`.

## Session Stats

next-zombie tracks restarts and shows stats on exit:

```bash
^C
[next-zombie] Session: 3 restarts, uptime 2h 15m
```

Each restart is numbered:
```
[next-zombie] Restarting... (#1)
[next-zombie] Restarting... (#2)
```

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
