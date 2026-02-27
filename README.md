# Accumulate JavaScript/TypeScript SDK

Production-ready JavaScript/TypeScript SDK for the Accumulate blockchain protocol. Supports V2 and V3 JSON-RPC APIs, Ed25519 and multi-algorithm signing, automatic signer version tracking via SmartSigner, BIP44 hierarchical wallets, Ledger hardware wallet integration, and a complete set of transaction builders for all account and token operations.

## Features

- **Smart Signing**: Automatic signer version tracking with `SmartSigner`
- **Complete Protocol Coverage**: All transaction types including identity, token, data, and key management operations
- **Dual API Support**: Both V2 and V3 JSON-RPC endpoints through a unified `Accumulate` client
- **Transaction Builders**: Static `TxBody` factory methods for all transaction types
- **Key Management**: `KeyManager` for querying key page state and managing multi-sig configurations
- **Helper Utilities**: `AccumulateHelper` for balance polling, oracle queries, and credit math
- **QuickStart API**: Ultra-simple `QuickStart` class for tutorials and rapid prototyping
- **Multi-Signature Support**: Ed25519, RCD1, BTC (secp256k1), ETH, RSA-SHA256, ECDSA-SHA256
- **BIP44 HD Wallets**: Hierarchical deterministic key derivation with mnemonic support
- **Ledger Integration**: Optional hardware wallet signing via Ledger devices
- **Network Ready**: Mainnet, Testnet (Kermit), and local DevNet support
- **TypeScript First**: Full type definitions for every API
- **Browser Compatible**: Webpack-bundled browser builds with polyfill support
- **Cross-Platform**: Runs in Node.js, browsers, and any JavaScript runtime

## Requirements

- [Node.js](https://nodejs.org/) 18+ (recommended: 20+)
- npm or yarn

## Installation

```bash
# npm
npm install accumulate.js

# yarn
yarn add accumulate.js
```

Or clone and build from source:

```bash
git clone https://gitlab.com/accumulatenetwork/sdk/javascript.git
cd javascript
yarn install
yarn build
```

## Quick Start

```typescript
import { Accumulate, Ed25519KeyPair, SmartSigner, TxBody, pollForBalance } from "accumulate.js";
import { calculateCreditsToAcme } from "accumulate.js/helpers";

// Connect to Kermit testnet
const client = Accumulate.forKermit();

// Generate a key pair and derive lite account URLs
const kp = Ed25519KeyPair.generate();
const lid = kp.deriveLiteIdentityUrl();
const lta = kp.deriveLiteTokenAccountUrl();

console.log(`Lite Identity: ${lid}`);
console.log(`Lite Token Account: ${lta}`);

// Fund via faucet and wait for balance
await client.faucet(lta, 5, 500);
const balance = await pollForBalance(client, lta);
console.log(`Balance: ${balance}`);

// Query account
const account = await client.queryAccount(lta);
```

## Smart Signing API

The `SmartSigner` class handles signer version tracking, transaction hashing, signing, submission, and delivery polling in a single call:

```typescript
import { Accumulate, Ed25519KeyPair, SmartSigner, TxBody } from "accumulate.js";
import { calculateCreditsToAcme } from "accumulate.js/helpers";

// Connect to testnet
const client = Accumulate.forKermit();

const kp = Ed25519KeyPair.generate();
const lid = kp.deriveLiteIdentityUrl();
const lta = kp.deriveLiteTokenAccountUrl();

// Create SmartSigner - automatically queries and tracks signer version
const signer = new SmartSigner(client, kp.toKey(), lid);

// Sign, submit, and wait for delivery in one call
const result = await signer.signSubmitAndWait(
  lta,
  TxBody.sendTokensSingle("acc://recipient.acme/tokens", BigInt(100_000_000)),
  { memo: "Payment" }
);

if (result.success) {
  console.log(`Transaction delivered: ${result.txid}`);
}
```

### SmartSigner Methods

| Method | Description |
|--------|-------------|
| `sign` | Sign a transaction and return the envelope without submitting |
| `signAndSubmit` | Sign and submit, return the raw response |
| `signSubmitAndWait` | Sign, submit, and poll until delivered or timeout |
| `addKey` | Add a key to the signer's key page |
| `removeKey` | Remove a key from the signer's key page |
| `setThreshold` | Set the multi-sig threshold on the signer's key page |
| `refreshVersion` | Query and cache the signer version |
| `getCredits` | Query the credit balance of the signer's key page |
| `invalidateCache` | Clear cached version |

## Transaction Builders

Build transaction bodies using the static `TxBody` factory class. Each method returns a typed protocol object ready for `SmartSigner`:

```typescript
import { TxBody } from "accumulate.js";

// Send tokens to a single recipient
TxBody.sendTokensSingle("acc://recipient/tokens", BigInt(100_000_000));

// Send to multiple recipients
TxBody.sendTokensMulti([
  { url: "acc://alice/tokens", amount: BigInt(50_000_000) },
  { url: "acc://bob/tokens", amount: BigInt(50_000_000) },
]);

// Add credits (requires oracle price)
TxBody.addCredits("acc://my-identity", acmeAmount, oracle);

// Transfer credits
TxBody.transferCredits("acc://dest-page", 5000);

// Create ADI
TxBody.createIdentity("acc://my-adi.acme", "acc://my-adi.acme/book", publicKeyHash);

// Create token account
TxBody.createTokenAccount("acc://my-adi.acme/tokens", "acc://ACME");

// Create custom token
TxBody.createToken("acc://my-adi.acme/mytoken", "MTK", 8, BigInt(100_000_000_000_000));

// Issue tokens (from token issuer)
TxBody.issueTokens("acc://my-adi.acme/token-acct", BigInt(50_000_000_000));

// Burn tokens
TxBody.burnTokens(BigInt(1_000_000));

// Create data account
TxBody.createDataAccount("acc://my-adi.acme/data");

// Write data (string entries, auto-converted to UTF-8)
TxBody.writeData(["Hello, Accumulate!"]);

// Write data from hex
TxBody.writeDataHex(["48656c6c6f"]);

// Write raw byte data
TxBody.writeDataRaw([new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])]);

// Key page operations
TxBody.updateKeyPageAddKey(keyHash);
TxBody.updateKeyPageRemoveKey(keyHash);
TxBody.updateKeyPageSetThreshold(2);

// Create key book and key page
TxBody.createKeyBook("acc://my-adi.acme/book2", publicKeyHash);
TxBody.createKeyPage([keyHash1, keyHash2]);
```

## Helper Utilities

### AccumulateHelper

The `AccumulateHelper` class provides mid-level convenience methods:

```typescript
import { Accumulate, AccumulateHelper } from "accumulate.js";

const client = Accumulate.forKermit();
const helper = new AccumulateHelper(client);

// Faucet with retry
await helper.faucet("acc://lite-token-account/ACME", 5);

// Oracle price (cached)
const oracle = await helper.getOracle();

// Buy credits
await helper.buyCredits({
  from: ltaUrl,
  to: lidUrl,
  credits: 50000,
  signer: keypair.toKey(),
  signerUrl: lidUrl,
});

// Query balances and credits
const balance = await helper.queryBalance("acc://my-adi.acme/tokens");
const credits = await helper.queryCredits("acc://my-adi.acme/book/1");

// Poll until balance appears (with timeout)
const bal = await helper.pollForBalance(ltaUrl, 0, 30, 2000);
const cred = await helper.pollForCredits(keyPageUrl, 0, 30, 2000);

// Create identity, token account, data account
await helper.createIdentity({ principal, url, keyBookUrl, publicKeyHash, signer, signerUrl });
await helper.createTokenAccount({ principal, url, signer, signerUrl });
await helper.createDataAccount({ principal, url, signer, signerUrl });
```

### Polling and Oracle Functions

Standalone utility functions available as direct imports:

```typescript
import {
  pollForBalance,
  pollForCredits,
  waitForTx,
  calculateCreditsToAcme,
  getOraclePrice,
  deriveLiteIdentityUrl,
  deriveLiteTokenAccountUrl,
} from "accumulate.js";

// Poll for balance or credits
const balance = await pollForBalance(client, ltaUrl);
const credits = await pollForCredits(client, keyPageUrl);

// Wait for a transaction to be delivered
const txResult = await waitForTx(client, txid);

// Credit/ACME conversion
const acmeAmount = calculateCreditsToAcme(10000, oracle);

// Derive lite URLs from a public key hash
const lid = deriveLiteIdentityUrl(publicKeyHash);
const lta = deriveLiteTokenAccountUrl(publicKeyHash, "ACME");
```

## Key Management

The `KeyManager` class queries key page state:

```typescript
import { Accumulate, KeyManager } from "accumulate.js";

const client = Accumulate.forKermit();
const keyManager = new KeyManager(client, "acc://my-adi.acme/book/1");

const state = await keyManager.getKeyPageState();
console.log(`Version: ${state.version}`);
console.log(`Threshold: ${state.acceptThreshold}`);
console.log(`Keys: ${state.keys.length}`);
console.log(`Credits: ${state.creditBalance}`);

for (const key of state.keys) {
  console.log(`  Key Hash: ${key.keyHash}`);
}

// Check if a key exists on the page
const exists = await keyManager.hasKey(keyHash);

// Add keys and set thresholds via KeyManager
await keyManager.addKey(signerKeypair, newKeyHash);
await keyManager.setThreshold(signerKeypair, 2);
```

Add keys and set thresholds via SmartSigner:

```typescript
const adiSigner = new SmartSigner(client, adiKey.toKey(), keyPageUrl);

// Add a new key
await adiSigner.addKey(newKeyHash);

// Set 2-of-3 multi-sig threshold
await adiSigner.setThreshold(2);
```

## QuickStart API

The `QuickStart` class provides an ultra-simple API for tutorials and demos:

```typescript
import { QuickStart } from "accumulate.js";

const qs = QuickStart.forKermit();

// Create and fund a wallet
const wallet = qs.createWallet();
await qs.fundWallet(wallet, 5);
console.log(`Balance: ${await qs.getBalance(wallet.liteTokenAccountUrl)}`);

// Buy credits
await qs.buyCredits(wallet, 50000);
console.log(`Credits: ${await qs.getCredits(wallet.liteIdentityUrl)}`);

// Send tokens
await qs.sendTokens(wallet, "acc://recipient/ACME", BigInt(100_000_000));

// Create an ADI with key book and key page
const adi = await qs.setupADI(wallet, "my-adi");
await qs.buyCreditsForADI(wallet, adi, 50000);

// Create accounts under the ADI
await qs.createTokenAccount(adi, "tokens");
await qs.createDataAccount(adi, "data");
await qs.writeData(adi, `${adi.url}/data`, ["Hello from QuickStart"]);

// Send tokens from ADI
await qs.sendTokensFromADI(adi, `${adi.url}/tokens`, "acc://dest/tokens", BigInt(1_000_000));

// Key management
await qs.addKeyToADI(adi, newKeyHash);
await qs.setMultiSigThreshold(adi, 2);
```

## Ed25519 Key Pairs

```typescript
import { Ed25519KeyPair } from "accumulate.js";

// Generate a random key pair
const kp = Ed25519KeyPair.generate();

// Create from a 32-byte seed
const kp2 = Ed25519KeyPair.fromSeed(seed);

// Create from a 64-byte private key
const kp3 = Ed25519KeyPair.fromPrivateKey(privateKey);

// Access key bytes
const pubKey = kp.publicKeyBytes();       // 32-byte Uint8Array
const privKey = kp.privateKeyBytes();     // 64-byte Uint8Array
const keyHash = kp.publicKeyHash();       // SHA256 of public key
const keyHashHex = kp.publicKeyHashHex(); // Hex-encoded hash

// Derive Accumulate URLs
const lid = kp.deriveLiteIdentityUrl();         // acc://...
const lta = kp.deriveLiteTokenAccountUrl();      // acc://.../ACME
const ltaCustom = kp.deriveLiteTokenAccountUrl("MYTKN");

// Use with SmartSigner
const signer = new SmartSigner(client, kp.toKey(), lid);
```

## BIP44 Hierarchical Wallets

```typescript
import { bip44 } from "accumulate.js";

const { BIP44 } = bip44;

// Generate a new mnemonic
const mnemonic = BIP44.generateMnemonic();

// Create HD wallet from mnemonic
const wallet = BIP44.fromMnemonic(mnemonic);

// Derive Ed25519 keys using BIP44 paths
const key = wallet.derive("m/44'/281'/0'/0'/0'");
```

## Network Endpoints

```typescript
import { Accumulate, NetworkEndpoint } from "accumulate.js";

// Public networks
const mainnet = Accumulate.forMainnet();
const testnet = Accumulate.forKermit();

// Local development
const devnet = Accumulate.forDevnet(); // 127.0.0.1:26660

// Named network enum
const client = Accumulate.forNetwork(NetworkEndpoint.Testnet);

// Custom endpoints
const custom = Accumulate.custom(
  "https://my-node.example.com/v2",
  "https://my-node.example.com/v3"
);

// From environment variables (ACCUMULATE_V2_URL, ACCUMULATE_V3_URL)
const envClient = Accumulate.fromEnv();
```

The unified `Accumulate` client exposes both API versions:

```typescript
client.v2  // V2 Client - legacy JSON-RPC (faucet, execute, query)
client.v3  // V3 JsonRpcClient - current JSON-RPC (submit, query, network-status)
```

## Supported Signature Types

| Type | Enum Value | Status |
|------|-----------|--------|
| Ed25519 | `ED25519 = 2` | Full signing support |
| Legacy Ed25519 | `LegacyED25519 = 1` | Protocol defined |
| RCD1 | `RCD1 = 3` | Full signing support |
| BTC (secp256k1) | `BTC = 8` | Full signing support |
| BTC Legacy | `BTCLegacy = 9` | Protocol defined |
| ETH (secp256k1) | `ETH = 10` | Full signing support |
| Delegated | `Delegated = 11` | Full signing support |
| RSA-SHA256 | `RsaSha256 = 14` | Protocol defined |
| ECDSA-SHA256 | `EcdsaSha256 = 15` | Protocol defined |
| TypedData (EIP-712) | `TypedData = 16` | Protocol defined |

## Manually Building and Signing a Transaction

For advanced use cases, you can construct transactions manually using the core protocol types:

```typescript
import { api_v2, ED25519Key, Signer } from "accumulate.js";
import { SendTokens, Transaction, TransactionHeader } from "accumulate.js/core";
import { Envelope } from "accumulate.js/messaging";

const sender = await Signer.forLite(await ED25519Key.generate());

// Build the transaction body
const recipient = await Signer.forLite(await ED25519Key.generate());
const body = new SendTokens({ to: [{ url: recipient.url.join("ACME"), amount: 10 }] });

// Build the transaction header
const header = new TransactionHeader({ principal: sender.url.join("ACME") });

// Build the unsigned transaction
const tx = new Transaction({ body, header });

// Sign with a key pair
const sig = await sender.sign(tx, { timestamp: Date.now() });
const env = new Envelope({ transaction: [tx], signatures: [sig] });

// Submit the envelope
const client = new api_v2.Client("https://mainnet.accumulatenetwork.io/v2");
const res = await client.execute(env);
await client.waitOnTx(res.txid.toString());
```

## Examples

Complete working examples are provided in `examples/v3/`. All examples run real on-chain operations against the Kermit testnet:

| Example | Description |
|---------|-------------|
| `example_01_lite_identities` | Lite identity creation, faucet funding, credits, lite-to-lite token transfer |
| `example_02_adi_creation` | ADI creation via SmartSigner |
| `example_03_token_accounts` | ADI token account creation and token transfers |
| `example_04_data_accounts` | Data account creation, writing and querying data entries |
| `example_05_adi_to_adi_transfer` | Full ADI-to-ADI token transfer workflow |
| `example_06_custom_tokens` | Custom token issuer creation, token issuance, and transfers |
| `example_07_query_operations` | V3 query APIs: accounts, chains, pending transactions |
| `example_08_query_transactions` | Transaction history and signature queries |
| `example_09_key_management` | Key export/import, adding keys to key pages, multi-sig thresholds |
| `example_10_threshold_updates` | Adding multiple keys and setting 2-of-3 threshold |
| `example_11_multi_signature_types` | Signature type enumeration and wire name lookups |
| `example_12_quickstart_demo` | Wallet creation, faucet, QuickStart API usage |
| `example_13_header_options` | ADI-to-ADI transfer with memo in transaction header |

### Advanced Examples

| Example | Description |
|---------|-------------|
| `advanced/delegated` | Delegated signing (authority chains) |
| `advanced/external` | External key integration |
| `advanced/ledger` | Ledger hardware wallet usage |

Run any example:

```bash
npx tsx examples/v3/example_01_lite_identities.ts
```

## Browser Usage

### Option 1: Using a Bundler (Recommended)

If you are using a bundler (webpack, rollup, etc.), import the library normally:

```javascript
import { Accumulate, Ed25519KeyPair, SmartSigner, TxBody } from "accumulate.js";
```

Make sure your bundler is configured to handle Node.js polyfills (buffer, crypto, stream, assert, path, util).

### Option 2: Direct Browser Usage

For direct browser usage without a bundler, include the browser bundle and necessary polyfills:

```html
<script src="https://bundle.run/buffer"></script>
<script src="https://bundle.run/process"></script>
<script src="path/to/accumulate.browser.js"></script>

<script>
  const { Accumulate, Ed25519KeyPair, SmartSigner, TxBody } = accumulate;
  const client = Accumulate.forKermit();
  // ...
</script>
```

## Project Structure

```
src/
├── index.ts                    # Main entry point and re-exports
├── address/                    # URL and address handling
│   ├── url.ts                  # AccumulateURL class
│   ├── txid.ts                 # Transaction ID wrapper
│   └── address.ts              # Key address types
├── api_v2/                     # V2 JSON-RPC client
│   ├── client.ts               # V2 client (execute, query, faucet, etc.)
│   └── rpc-client.ts           # Low-level RPC transport (axios)
├── api_v3/                     # V3 JSON-RPC client
│   ├── client.ts               # V3 client (submit, query, network-status)
│   └── msg.ts                  # V3 message types
├── bip44/                      # BIP44 hierarchical wallet derivation
│   ├── index.ts                # HDWallet, BIP44, mnemonic support
│   └── path.ts                 # BIP44 path construction
├── common/                     # Shared utilities
│   ├── sha256.ts               # SHA-256 hashing
│   ├── sha512.ts               # SHA-512 hashing
│   ├── keccak.ts               # Keccak hashing (Ethereum)
│   ├── hash_tree.ts            # Merkle/hash tree computation
│   ├── buffer.ts               # Buffer utilities
│   └── util.ts                 # General utilities
├── core/                       # Protocol types (generated + extensions)
│   ├── enums_gen.ts            # TransactionType, SignatureType, AccountType
│   ├── types_gen.ts            # Protocol message types
│   ├── unions_gen.ts           # Union types
│   └── index.ts                # Extensions and custom hash methods
├── crypto/                     # Multi-signature key pairs
│   └── secp256k1_keypair.ts    # Secp256k1 (BTC/ETH) key pair
├── encoding/                   # Protocol binary encoding
│   ├── index.ts                # encode(), consume(), field metadata
│   ├── encoding.ts             # Low-level encoding functions
│   └── encodable.ts            # Encodable field types
├── errors/                     # Error type hierarchy
├── helpers/                    # High-level convenience layer
│   ├── accumulate.ts           # Unified client facade (V2 + V3)
│   ├── smart_signer.ts         # Auto-version signer with submit + wait
│   ├── tx_body.ts              # Static transaction body factory
│   ├── ed25519_keypair.ts      # Ed25519 wrapper with URL derivation
│   ├── unified_keypair.ts      # Multi-type key wrapper
│   ├── key_manager.ts          # Key page state queries and mutations
│   ├── quick_start.ts          # Ultra-simple API for demos
│   ├── accumulate_helper.ts    # Mid-level convenience methods
│   ├── polling.ts              # Balance/credit/tx polling helpers
│   ├── oracle.ts               # ACME-to-credits conversion math
│   ├── lite_url.ts             # Lite identity/token URL derivation
│   ├── network.ts              # Network endpoint presets
│   └── types.ts                # Shared TypeScript interfaces
├── ledger/                     # Ledger hardware wallet support
│   ├── ledger-api.ts           # Ledger device communication
│   ├── hw/index.ts             # Device discovery and transport
│   ├── deferred.ts             # Conditional Ledger import (lazy)
│   └── model/results.ts        # Ledger result types
├── merkle/                     # Merkle tree receipts
├── messaging/                  # Transaction envelopes and messages
├── network/                    # Network type definitions
└── signing/                    # Core signing infrastructure
    ├── ed25519.ts              # ED25519Key, RCD1Key, SimpleExternalKey
    ├── key.ts                  # Key interface and base classes
    └── signer.ts               # Signer, SignerWithVersion

examples/
├── v3/                         # 13 complete working examples
├── advanced/                   # Delegated signing, external keys, Ledger
└── archive/                    # Legacy examples for reference

test/                           # Unit tests (Jest)
test-it/                        # Integration tests (real network)
```

## Building

```bash
# Install dependencies
yarn install

# Build TypeScript to JavaScript
yarn build

# Build browser bundle
yarn build:browser

# Run an example
npx tsx examples/v3/example_01_lite_identities.ts
```

## Running Tests

```bash
# Run unit tests
yarn test:unit

# Run integration tests (requires network access)
yarn test:integration

# Run all tests
yarn test:all

# Run browser tests
yarn test:browser
```

## Linting and Formatting

```bash
# Lint
yarn lint

# Format code
yarn format

# Check formatting
yarn format:check
```

## Dependencies

### Runtime

| Package | Version | Purpose |
|---------|---------|---------|
| `tweetnacl` | 1.0.3 | Ed25519 signing and key generation |
| `axios` | 0.27.2 | HTTP client for JSON-RPC transport |
| `bn.js` | 5.2.1 | Big number arithmetic |
| `sprintf-js` | 1.1.3 | String formatting |
| `reflect-metadata` | 0.1.13 | Decorator metadata for encoding |

### Optional (Peer Dependencies)

| Package | Purpose |
|---------|---------|
| `@ledgerhq/hw-transport-*` | Ledger hardware wallet transports |
| `@noble/secp256k1` | Secp256k1 signing (BTC, ETH) |
| `@scure/bip32` | BIP32 HD key derivation |
| `@scure/bip39` | BIP39 mnemonic generation |
| `ed25519-hd-key` | Ed25519 hierarchical derivation |

## Error Handling

```typescript
import { Accumulate, SmartSigner, TxBody } from "accumulate.js";

const result = await signer.signSubmitAndWait(principal, body);

if (result.success) {
  console.log(`Transaction delivered: ${result.txid}`);
} else {
  console.log(`Transaction failed: ${result.error}`);
}
```

The `TxResult` returned by `signSubmitAndWait` contains:

| Property | Type | Description |
|----------|------|-------------|
| `success` | `boolean` | Whether the transaction was delivered successfully |
| `txid` | `string` | The transaction ID (`acc://...` URL) |
| `error` | `string?` | Error message if the transaction failed |
| `rawResponse` | `any?` | Raw response from the server |
| `simpleHash` | `string?` | Simple hash of the transaction, hex-encoded |

## API Documentation

Generated TypeDoc documentation is available at:
https://accumulatenetwork.gitlab.io/sdk/javascript/

To generate documentation locally:

```bash
yarn doc
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Links

- [Accumulate Protocol](https://accumulatenetwork.io/)
- [API Documentation](https://docs.accumulatenetwork.io/)
- [SDK Documentation](https://accumulatenetwork.gitlab.io/sdk/javascript/)
- [Kermit Testnet Explorer](https://kermit.explorer.accumulatenetwork.io/)
