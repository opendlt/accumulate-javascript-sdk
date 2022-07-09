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
import { Client, LiteIdentity, TxSigner, Ed25519KeypairSigner } from "accumulate.js";

const client = new Client("https://testnet.accumulatenetwork.io/v2");

// Generate a random LiteIdentity (this is only local, until that account receive its first tokens)
const lid = new LiteIdentity(Ed25519KeypairSigner.generate());
// Request some ACME token to get started from the faucet
let res = await client.faucet(lid.acmeTokenAccount);
await client.waitOnTx(res.txid);

// check the ACME token balance
console.log(await client.queryUrl(lid.acmeTokenAccount));

// Convert some tokens into credits necessary to perform operations on Accumulate
const oracle = await client.queryAcmeOracle();
const addCredits = {
  recipient: lid.url,
  amount: 1000 * 1e8,
  oracle,
};
res = await client.addCredits(lid.acmeTokenAccount, addCredits, lid);
await client.waitOnTx(res.txid);

// check the credits balance
console.log(await client.queryUrl(lid.url));

// Send some tokens to another random Lite ACME token Account
const recipient = new LiteIdentity(Ed25519KeypairSigner.generate());
const sendTokens = { to: [{ url: recipient.acmeTokenAccount, amount: 12 }] };
res = await client.sendTokens(lid.acmeTokenAccount, sendTokens, lid);
await client.waitOnTx(res.txid);

// Now with the credits we can create an Accumulate Digital Identifier (ADI)
// which is one of the fundamental feature of the network

const identitySigner = Ed25519KeypairSigner.generate(); // Root signer that will control the identity
const identityUrl = "acc://my-own-identity.acme";
const bookUrl = identityUrl + "/my-book";

const createIdentity = {
  url: identityUrl,
  keyHash: identitySigner.publicKeyHash,
  keyBookUrl: bookUrl,
};

res = await client.createIdentity(lid.url, createIdentity, lid);
await client.waitOnTx(res.txid);

// check your identity
console.log(await client.queryUrl(identityUrl));

// Instantiate a TxSigner that can now sign transactions on behalf of this identity
// (after receiving credits on the identity initial key page)
const keyPageUrl = bookUrl + "/1";
const addCredits2 = {
  recipient: keyPageUrl,
  amount: 1000 * 1e8,
  oracle,
};
res = await client.addCredits(lid.acmeTokenAccount, addCredits2, lid);
await client.waitOnTx(res.txid);
const identityKeyPage = new TxSigner(keyPageUrl, identitySigner);
```

### Manually building and signing a transaction

```js
// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { Transaction, Header, Client, SendTokens, LiteIdentity, Ed25519KeypairSigner } from "../src";

const sender = new LiteIdentity(Ed25519KeypairSigner.generate());

// Build the Payload
const recipient = new LiteIdentity(Ed25519KeypairSigner.generate());
const amount = 10;
const payload = new SendTokens({ to: [{ url: recipient.acmeTokenAccount, amount: amount }] });
// Build the transaction header with the transaction principal
// and optionally a timestamp, memo or metadata.
const header = new Header(sender.acmeTokenAccount);

// Finally build the (unsigned yet) transaction
const tx = new Transaction(payload, header);
const dataForSignature = tx.dataForSignature(sender.info);
const signature = ... // manually sign `dataForSignature` with custom key store, Ledger, etc
// Set the signature on the transaction
tx.signature = { signerInfo: sender.info, signature };

const client = new Client("https://testnet.accumulatenetwork.io/v2");
res = await client.execute(tx);
await client.waitOnTx(res.txid);
```