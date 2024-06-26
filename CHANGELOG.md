# Changelog

## v0.11.4

- Removes unnecessary dependency on `readable-stream`.

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