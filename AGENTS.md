# opendlt-javascript-v2v3-sdk — repository guide for agents

The JavaScript / TypeScript SDK for the Accumulate blockchain. Published as `accumulate-sdk-opendlt` (v2.3.0).

> Building **on** Accumulate rather than **on this SDK**? You want `llms.txt` (quickstart + rules) and `llms-full.txt` (full API). This file is about working on the SDK itself.

## Setup

Toolchain: **Node >= 18**

```bash
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
src/     TypeScript sources
lib/     build output; `lib/index.js` re-exports `lib/src/index.js`
test/    unit tests
```

## CLI

This repo ships the `accumulate` CLI. Run it from the checkout with:

```bash
node lib/src/cli.js --json version
```

It conforms to `docs/ai-agent-readiness/CLI-SPEC.md` in accumulate-studio: one JSON
envelope on stdout, `ACC_*` error codes, exit codes 0/1/2/3. **Changing its output shape
is a contract change** — re-run the shared conformance suite, which gates all five SDKs:

```bash
node tools/cli-conformance/run.mjs --cmd "node lib/src/cli.js" --cwd . --sdk javascript
```

## Gotchas

- This repository root IS the package root: `package.json` sits here. Do not look for a `javascript/` subdirectory — that is an artifact of some local working copies and is not part of this repo.
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
