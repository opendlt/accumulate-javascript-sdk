# Changelog

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