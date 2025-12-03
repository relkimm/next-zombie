# next-zombie

> Auto-recovery CLI for Next.js. Your dev server rises from the dead.

[![npm version](https://img.shields.io/npm/v/next-zombie.svg)](https://www.npmjs.com/package/next-zombie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Tired of manually restarting your Next.js dev server after a crash? **next-zombie** automatically clears the `.next` cache and restarts the server — so you can focus on coding, not babysitting your terminal.

## Features

- **Auto-Recovery** — Automatically restarts on crash with cache cleanup
- **Error Detection** — Monitors for `_buildManifest.js.tmp` ENOENT errors and auto-restarts
- **Zero Config** — Works out of the box with your existing setup
- **Package Manager Agnostic** — Detects and uses npm, yarn, pnpm, or bun
- **Preserves Your Config** — Runs your actual `dev` script, including Turbopack settings
- **Graceful Shutdown** — Clean exit on `Ctrl+C`, no zombie processes

## Installation

```bash
npm install -D next-zombie
```

Or with other package managers:

```bash
yarn add -D next-zombie
pnpm add -D next-zombie
bun add -D next-zombie
```

## Usage

### Quick Start

```bash
npx next-zombie dev
```

### Add to package.json

```json
{
  "scripts": {
    "dev": "next-zombie"
  }
}
```

### Custom Scripts & Arguments

```bash
# Run the default 'dev' script
next-zombie

# Run a custom script
next-zombie start

# Pass additional arguments
next-zombie dev --port 3001
```

## Why?

Next.js dev servers can crash due to:

- Corrupted `.next` cache (`_buildManifest.js.tmp` ENOENT errors)
- Syntax errors in config files
- Memory issues
- Plugin conflicts

When this happens, you typically need to manually stop the process, delete `.next`, and restart. **next-zombie** handles all of this automatically.

## How It Works

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│   next-zombie dev                                         │
│         │                                                 │
│         ▼                                                 │
│   ┌───────────┐                                           │
│   │ Clean     │ ◄──────────────────────────────┐          │
│   │ .next     │                                │          │
│   └─────┬─────┘                                │          │
│         │                                      │          │
│         ▼                                      │          │
│   ┌───────────┐    Crash or Cache Error?   ┌──┴──┐       │
│   │ npm run   │ ─────────────────────────► │Wait │       │
│   │ dev       │                            │1.5s │       │
│   └─────┬─────┘                            └─────┘       │
│         │                                                 │
│         │ Ctrl+C                                          │
│         ▼                                                 │
│   ┌───────────┐                                           │
│   │ Exit      │                                           │
│   └───────────┘                                           │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## Requirements

- Node.js >= 18.0.0
- Next.js project

## License

MIT © [relkimm](https://github.com/relkimm)
