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
import { Client, LiteAccount, TxSigner, Ed25519KeypairSigner } from "accumulate.js";

const client = new Client("https://testnet.accumulatenetwork.io/v2");

// Generate a random LiteAccount (this is only local, until that account receive its first tokens)
const acc = new LiteAccount(Ed25519KeypairSigner.generate());
// Request some ACME token to get started from the faucet
await client.faucet(acc.url);

// ... wait a few seconds for the tx to be finalized ...
// check the balance
console.log(await client.queryUrl(acc.url));

// Send some tokens to another random Lite Account
const recipient = new LiteAccount(Ed25519KeypairSigner.generate());
const sendTokens = { to: [{ url: recipient.url, amount: 12 }] };
await client.sendTokens(acc.url, sendTokens, acc);
// ... wait a few seconds for the tx to be finalized ...

// Convert some tokens into credits necessary to perform most operations on Accumulate
const oracle = await client.queryAcmeOracle();
let addCredits = {
  recipient: acc.url,
  amount: 1e8,
  oracle,
};
await client.addCredits(acc.url, addCredits, acc);

// ... wait a few seconds for the tx to be finalized ...
// check the credits balance
console.log(await client.queryUrl(acc.url));

// Now with the credits we can create an Accumulate Digital Identifier (ADI)
// which is one of the fundamental feature of the network

const identitySigner = Ed25519KeypairSigner.generate(); // Root signer that will control the identity
const identityUrl = "acc://my-own-identity";
const bookUrl = identityUrl + "/my-book";

const createIdentity = {
  url: identityUrl,
  keyHash: identitySigner.publicKeyHash,
  keyBookUrl: bookUrl,
};

await client.createIdentity(acc.url, createIdentity, acc);

// ... wait a few seconds for the tx to be finalized ...
// check your identity
console.log(await client.queryUrl(identityUrl));

// Instantiate a TxSigner that can now sign transactions on behalf of this identity
// (after receiving credits on the identity initial key page)
const keyPageUrl = bookUrl + "/1";
addCredits = {
  recipient: keyPageUrl,
  amount: 1e8,
  oracle,
};
await client.addCredits(acc.url, addCredits, acc);
const identityKeyPage = new TxSigner(keyPageUrl, identitySigner);
```

### Manually building and signing a transaction

```js
// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { Transaction, Header, Client, SendTokens, LiteAccount, Ed25519KeypairSigner } from "../src";

const sender = new LiteAccount(Ed25519KeypairSigner.generate());

// Build the Payload
const recipient = new LiteAccount(Ed25519KeypairSigner.generate());
const amount = 10;
const payload = new SendTokens({ to: [{ url: recipient.url, amount: amount }] });
// Build the transaction header with the transaction principal
// and optionally a timestamp, memo or metadata.
const header = new Header(sender.url);

// Finally build the (unsigned yet) transaction
const tx = new Transaction(payload, header);
const dataForSignature = tx.dataForSignature(sender.info);
const signature = ... // manually sign `dataForSignature` with custom key store, Ledger, etc
// Set the signature on the transaction
tx.signature = { signerInfo: sender.info, signature };

const client = new Client("https://testnet.accumulatenetwork.io/v2");
await client.execute(tx);
```