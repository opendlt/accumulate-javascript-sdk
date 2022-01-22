# Accumulate JavaScript SDK

**The TS/JS SDK is currently under active development and is not deemed stable.**

This is the Accumulate JavaScript SDK built on the Accumulate JSON RPC API.

## Installation

```bash
# Yarn
$ yarn add accumulate.js
# npm
$ npm install --save accumulate.js
```

## Usage

For more usage examples see the file `test-it/client.test.ts`.

### Quick start tutorial

Demo of some of the main APIs of Accumualte:

```js
import { Client, LiteAccount, Keypair } from "accumulate.js";

const client = new Client("https://testnet.accumulatenetwork.io/v2");

// Generate a random LiteAccount (this is only local, until that account receive its first tokens)
const acc = LiteAccount.generate();
// Request some ACME token to get started from the faucet
await client.faucet(acc.url);

// ... wait a few seconds for the tx to be finalized ...
// check the balance
console.log(await client.queryUrl(acc.url));

// Send some tokens to another random Lite Account
const recipient = LiteAccount.generate();
const sendTokens = { to: [{ url: recipient.url, amount: 12 }] };
await client.sendTokens(sendTokens, acc);
// ... wait a few seconds for the tx to be finalized ...

// Convert some tokens into credits necessary to perform most operations on Accumulate
const addCredits = {
  recipient: acc.url,
  amount: 10000,
};
await client.addCredits(addCredits, acc);

// ... wait a few seconds for the tx to be finalized ...
// check the credits balance
console.log(await client.queryUrl(acc.url));

// Now with the credits we can create an Accumulate Digital Identifier (ADI)
// which is one of the fundamental feature of the network

const identityKeypair = Keypair.generate(); // Root keypair that will control the identity
const identityUrl = "acc://my-own-identity";
const createIdentity = {
  url: identityUrl,
  publicKey: identityKeypair.publicKey,
  keyBookName: "book0",
  keyPageName: "page0",
};

await client.createIdentity(createIdentity, acc);

// ... wait a few seconds for the tx to be finalized ...
// check your identity
console.log(await client.queryUrl(identityUrl));
```

## For contributors

### Build

```
yarn build
```

### Tests

- `yarn test` runs unit tests.
- `yarn test-integration` runs integration tests that require to run against a live instance of Accumulate RPC API.
- `yarn test-all` run both unit and integration tests, with code coverage.

Integration tests require a running instance of Accumulate RPC API, by default it will assume one is running locally at `http://127.0.1.1:26660/v2`. The endpoint can be overriden with an environment variable: `ACC_ENDPOINT="https://testnet.accumulatenetwork.io/v2" yarn test-integration`.
