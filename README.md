# next-zombie

> Auto-recovery CLI for Next.js. Your dev server rises from the dead.

[![npm version](https://img.shields.io/npm/v/next-zombie.svg)](https://www.npmjs.com/package/next-zombie)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Tired of manually restarting your Next.js dev server after a crash? **next-zombie** automatically clears the `.next` cache and restarts the server when it crashes — so you can focus on coding, not babysitting your terminal.

## Why?

Next.js development servers can crash for various reasons:

- Corrupted `.next` cache
- Syntax errors in config files
- Memory issues
- Plugin conflicts

When this happens, you typically need to:

1. Stop the crashed process
2. Delete the `.next` folder
3. Restart the dev server

**next-zombie** does all of this automatically.

## Installation

```bash
# npm
npm install -D next-zombie

# yarn
yarn add -D next-zombie

# pnpm
pnpm add -D next-zombie

# bun
bun add -D next-zombie
```

## Usage

Replace your `dev` script with `zombie`:

```json
{
  "scripts": {
    "dev": "zombie"
  }
}
```

That's it. Your existing Next.js configuration (including Turbopack) is preserved.

### Running with npx

```bash
npx zombie dev
# or
npx next-zombie dev
```

### Running Custom Scripts

```bash
# Run the default 'dev' script
zombie

# Run a custom script
zombie start

# Pass additional arguments
zombie dev --port 3001
```

## Features

- **Auto-Recovery** — Automatically restarts on crash with cache cleanup
- **Zero Config** — Works out of the box with your existing setup
- **Package Manager Agnostic** — Detects and uses npm, yarn, pnpm, or bun
- **Preserves Your Config** — Runs your actual `dev` script, including Turbopack settings
- **Graceful Shutdown** — Clean exit on `Ctrl+C`, no zombie processes
- **Minimal Dependencies** — Only 2 tiny dependencies

## How It Works

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   zombie dev                                            │
│        │                                                │
│        ▼                                                │
│   ┌─────────────┐                                       │
│   │ Clean .next │ ◄─────────────────────────┐           │
│   └──────┬──────┘                           │           │
│          │                                  │           │
│          ▼                                  │           │
│   ┌─────────────┐      Crash?          ┌────┴────┐      │
│   │  npm run    │ ────────────────────►│  Wait   │      │
│   │    dev      │   (exit code ≠ 0)    │   1s    │      │
│   └──────┬──────┘                      └─────────┘      │
│          │                                              │
│          │ Ctrl+C or success                            │
│          ▼                                              │
│   ┌─────────────┐                                       │
│   │    Exit     │                                       │
│   └─────────────┘                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Requirements

- Node.js >= 18.0.0
- Next.js project

## License

MIT © [relkimm](https://github.com/relkimm)
