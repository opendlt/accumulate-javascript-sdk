# Changelog

## [2.3.4] - 2026-07-30

### Added
- **`tx sign`** — the CLI can now sign. It is the ONLY verb that signs, requires an
  explicit `--key-file`/`--key-env`, and delegates to the SDK's own signer so the
  produced bytes match the library path exactly (they are consensus-visible).
- `tx build` now emits a **real transaction body** via `TxBody` and rejects unknown
  ops. It previously echoed `{op, params}` back, so a typo exited 0 and only
  surfaced at submit — or never.
- `--out` on `tx build`/`tx sign`, so build -> sign -> submit composes through files.
- Op and parameter names accept either `snake_case` or `camelCase`.

### Fixed
- **`tx submit` no longer claims to sign.** It accepted `--key-file`/`--key-env`
  and never used them, advertising a capability that did not exist. Those flags are
  gone and it now declares `signs: false`; the envelope must already be signed.

## [2.3.3] - 2026-07-30

### Added
- **Structured CLI** (`accumulate`): 13 verbs, `--json` emits exactly one envelope
  object on stdout, canonical `ACC_*` error codes with a `retryable` flag, and exit
  codes 0/1/2/3 an agent can branch on without parsing. `accumulate --help --json`
  returns the whole command tree. Defaults to testnet; mainnet requires both
  `--network mainnet` and `ACCUMULATE_ALLOW_MAINNET=1`.
  Conforms to `CLI-SPEC.md`; verified by a shared conformance suite across all five SDKs.
- `llms.txt` and `AGENTS.md` now document the CLI.

## [2.3.2] - 2026-07-29

### Fixed
- `@noble/secp256k1` was declared only under `devDependencies` while
  `lib/src/crypto/secp256k1_keypair.js` imports it, and `rxjs` was not declared
  at all while `lib/src/ledger/hw/index.js` imports it. Both modules ship, so
  consumers importing them got `ERR_MODULE_NOT_FOUND`. Both are now runtime
  dependencies. Found by the new `DEPS_DECLARED` check in `artifact-verify`,
  which audits every bare import in the published tarball against the declared
  dependencies — the root-import probe missed these because neither module sits
  on the root barrel's import path.

## [2.3.1] - 2026-07-29

### Added
- Canonical Accumulate error catalog in `llms-full.txt`: every error code with its
  category, whether a retry is productive (`retryable`), likely causes, the concrete
  fix, and the TypeScript type to catch. Each operation now lists the errors it can raise.
- `.devcontainer/devcontainer.json` pinning this repo's toolchain, defaulting to the
  Kermit testnet and carrying no credentials.

### Fixed
- `AGENTS.md` setup, test and layout paths now match this repository's actual root.
  They previously instructed agents to `cd` into a subdirectory that does not exist
  in a fresh clone, so the very first setup command failed.

## [2.3.0] - 2026-07-28

### Added
- `Amount.token(whole, precision)` / `toToken(precision)` for **custom tokens**. Custom tokens declare their own precision at creation; the wire format is always base units. Previously `Amount` covered only ACME and credits, so issuing a custom token meant hand-computing a power of ten — and issuing `1000` against a precision-8 token mints `0.00001` tokens, not 1000, while the transaction succeeds either way.

### Changed
- Fleet version alignment: all five Accumulate SDKs now ship 2.3.0 with the same `Amount` surface.

## v2.2.1

### Fixed
- **The root import was broken in a clean install.** `import { ... } from 'accumulate-sdk-opendlt'` threw `ERR_MODULE_NOT_FOUND`. The root barrel eagerly re-exports `bip44` (`export * as bip44` in `src/index.ts`), whose module imports `@scure/bip32`, `bip39`, and `ed25519-hd-key` — all three declared under `devDependencies` and therefore absent for consumers. They are now runtime `dependencies`.

  This affected every consumer following the documented quickstart. The `accumulate-sdk-opendlt/helpers` subpath was unaffected and was the only working entry point in 2.2.0.

## v0.12.3

- Publishes under the OpenDLT-owned npm name `accumulate-sdk-opendlt` (matching the Python package). The unscoped `accumulate.js` name is maintained by the upstream Accumulate Networks team; this OpenDLT fork ships under its own name.

## v0.12.2

- (unreleased) Interim rename to `@opendlt/accumulate.js`; superseded by the unscoped `accumulate-sdk-opendlt` name in v0.12.3.

## v0.12.1

- Fixes `Time` binary encoding to use a signed varint (zigzag), matching Go's `WriteTime`. Transactions with time fields (signature timestamps, `Expire`/`HoldUntil`) now hash and sign correctly.
- Updates package metadata (homepage/repository/bugs) to the OpenDLT GitHub home.

## v0.12.0

- Adds SmartSigner with automatic signer version tracking and transaction lifecycle management.
- Adds TxBody builders for all transaction types (aligned with Dart/Python/Rust SDKs).
- Adds KeyManager for key page state queries and multi-sig configuration.
- Adds QuickStart class for rapid prototyping and tutorials.
- Adds Ed25519KeyPair, UnifiedKeyPair, and Secp256k1KeyPair helpers.
- Adds AccumulateHelper with balance polling, oracle queries, and credit math.
- Adds Accumulate facade class with unified V2/V3 client access.
- Adds public key hash support for BTC, RSA, and ECDSA signature types.
- Fixes ESM/browser compatibility by replacing require() with module preloading in encoding.
- Fixes Time encoding to floor milliseconds before BigInt conversion.
- Fixes type-only exports for strict TypeScript compilation.
- Reorganizes examples into v3/, advanced/, and archive/ directories.
- Rewrites README with comprehensive API documentation and usage examples.

## v0.11.9

- Fixes rejecting transactions.
- Adds a multisig example.

## v0.11.8

- Bug fix for API v2 client.

## v0.11.7

- Bug fix for signing.

## v0.11.6

- Improvements for external signing.

## v0.11.5

- Fixes (updates) `KeySignature` and `UserSignature`.
- Adds `TypedDataSignature` (EIP-712).

## v0.11.4

- Removes unnecessary dependency on `readable-stream`.
- Removes dependency on `tiny-secp256k1`, requiring the caller to provide it.
- Exports bip44.

## v0.11.3

- Fixes nil value handling in API responses.

## v0.11.2

- Don't export BIP44 because it breaks browser apps.

## v0.11.1

- Export keccak and other utilities.

## v0.11.0

- Adds SHA-256, SHA-512, and Keccak implementations.
- Removes async/await rendered unnecessary by the built-in hash implementations.
- Fixes formatting of ETH addresses.

## v0.10.10

- Adds support for batch API requests.
- Fixes API v3 query overloads.

## v0.10.9

- Modifies data type annotations to allow recovering the type of an enum field.

## v0.10.8

- Fixes a bug calculating the hash of empty entries.

## v0.10.7

- Adds a `hash` method to data entries.

## v0.10.6

- Fixes a bug that broke some chain queries.

## v0.10.5

- Adds `equals` method to URL and TxID.

## v0.10.3

- Fixes a bug that broke some chain queries.

## v0.10.2

- Exports SHA-256 helper.

## v0.10.1

- Improves support for pure JavaScript environments.
- Updates type definitions to Accumulate 1.3.

## v0.10.0

- Adds support for BIP-44 key derivation.
- Defers import of ledger modules to make accumulate.js usable in more
  environments.

## v0.9.3

- Fixes the response type of the faucet.

## v0.9.2

- Fixes a bug in `ED25519.from` that caused signing to fail.

## v0.9.0

- Adds support for signing with a Ledger Nano.

## v0.8.6

- Removes dependence on Node, eliminating the need for browsers shims.
- Fixes compatibility issues between Node and browser implementations of URL.

## v0.8.5

- Fixes a bug in the binary encoding of accounts.

## v0.8.4

- Improves support for browser-based environments.
- Adds hooks to the binary encoder to support alternative uses.

## v0.8.3

- Fixes a compatibility issue with exports declared in package.json.

## v0.8.2

- Adds API v3 support.
- Replaces third party bigint support with native implementation.
- Refactors signing.

## v0.8.1

- Implements AIP-001 address formatting.
- Updates hashing operations to be compatible with browser targets.

## v0.8

- Generates SDK types directly from Accumulate type definitions.
- Updates the process of manually signing a transaction to align better with the
  protocol.
- Renames signer classes to align better with the protocol.

## v0.7.3

- Adds support for double hash data entries.

## v0.7.2

- Fixes BN export.

## v0.7.1

- Adds helper function for creating token accounts for custom tokens.

## v0.7

- Compatibility with Accumulate v1.0.0.
