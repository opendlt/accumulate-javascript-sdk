# opendlt-javascript-v2v3-sdk — repository guide for agents

The JavaScript / TypeScript SDK for the Accumulate blockchain. Published as `accumulate-sdk-opendlt` (v2.3.0).

> **The project root is `javascript/`, not the repository root.** Run every command below from there unless stated otherwise.

> Building **on** Accumulate rather than **on this SDK**? You want `llms.txt` (quickstart + rules) and `llms-full.txt` (full API). This file is about working on the SDK itself.

## Setup

Toolchain: **Node >= 18**

```bash
cd javascript
npm ci
```

## Build

```bash
npm run build   # tsc -p tsconfig.json
```

## Test

| Command | Covers | Needs network |
|---|---|:--:|
| `npm run test:unit` | unit suite | no |
| `npm run test:integration` | integration | **yes** |
| `npm run test:all` | everything except browser | **yes** |

Network-dependent suites talk to a live testnet. If they fail while the unit suite passes, suspect the network before suspecting your change.

## Lint & format

```bash
npm run lint
npm run format:check
```

## Layout

```
javascript/src/     TypeScript sources (this is the real project root)
javascript/lib/     build output; `lib/index.js` re-exports `lib/src/index.js`
javascript/test/    unit tests
javascript/test-it/ integration tests
```

## Gotchas

- The repo root is not the package root; `javascript/` holds `package.json`.
- `npm run build` must run before tests that import from `lib/`.
- The SDK submits transactions as JSON via the V2 `execute-direct` endpoint, not binary — do not port binary-marshaling assumptions here.
- `TxBody.updateKeyPage([{...}])` with plain objects does not work. Use the typed methods: `updateKeyPageAddKey`, `updateKeyPageRemoveKey`, `updateKeyPageSetThreshold`.

## Permitted commands

Safe to run unattended: build, test, lint, format, and any read-only query against a **testnet**.

Require a human first:

- publishing or releasing (registry writes are irreversible)
- anything targeting **mainnet**
- rewriting git history, force-pushing, or changing CI credentials
- changing transaction marshaling or signing bytes — consensus-visible

## Before you commit

```bash
npm run code-check && npm run test:unit
```
