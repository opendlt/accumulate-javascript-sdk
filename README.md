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

[Latest SDK Documentation](https://accumulatenetwork.gitlab.io/accumulate.js/).

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

### Manually building and signing a transaction

```js
// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { Transaction, Client, SendTokens, LiteAccount, Header, BN } from "../src";

// Build the Payload
const recipient = LiteAccount.generate();
const amount = new BN(10);
const payload = new SendTokens({ to: [{ url: recipient.url, amount: amount }] });
// Build the transaction header with the transaction origin
// and optionally the keyPageHeight, keyPageIndex or nonce.
const header = new Header("acc://my-identity/token-account");

// Finally build the (unsigned yet) transaction
const tx = new Transaction(payload, header);
const dataForSignature = tx.dataForSignature();
const signature = ... // manually sign `dataForSignature` with (custom key store, Ledger, etc)
// Set the signature on the transaction
tx.signature = signature;

const client = new Client("https://testnet.accumulatenetwork.io/v2");
await client.execute(tx);
```