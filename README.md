# Accumulate JavaScript SDK

This is the Accumulate JavaScript SDK built on the Accumulate JSON RPC API.

## Installation

```bash
# Yarn
$ yarn add accumulate.js
# npm
$ npm install --save accumulate.js
```

## Usage

[Latest SDK Documentation](https://accumulatenetwork.gitlab.io/sdk/javascript/).

For more usage examples see the file `test-it/client.test.ts`.

### Quick start tutorial

Demo of some of the main APIs of Accumualte:

```js
import { Client, LiteSigner, PageSigner, ED25519KeypairSigner, sha256 } from "accumulate.js";

const client = new Client("https://mainnet.accumulatenetwork.io/v2");

// Generate a random LiteSigner (this is only local, until that account receive its first tokens)
const lid = await LiteSigner.from(ED25519KeypairSigner.generate());
// Request some ACME token to get started from the faucet
let res = await client.faucet(lid.acmeTokenAccount);
await client.waitOnTx(res.txid.toString());

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
await client.waitOnTx(res.txid.toString());

// check the credits balance
console.log(await client.queryUrl(lid.url));

// Send some tokens to another random Lite ACME token Account
const recipient = await LiteSigner.from(ED25519KeypairSigner.generate());
const sendTokens = { to: [{ url: recipient.acmeTokenAccount, amount: 12 }] };
res = await client.sendTokens(lid.acmeTokenAccount, sendTokens, lid);
await client.waitOnTx(res.txid.toString());

// Now with the credits we can create an Accumulate Digital Identifier (ADI)
// which is one of the fundamental feature of the network

const identitySigner = ED25519KeypairSigner.generate(); // Root signer that will control the identity
const identityUrl = "acc://my-own-identity.acme";
const bookUrl = identityUrl + "/my-book";

const createIdentity = {
    url: identityUrl,
    keyHash: await sha256(identitySigner.publicKey),
    keyBookUrl: bookUrl,
};

res = await client.createIdentity(lid.url, createIdentity, lid);
await client.waitOnTx(res.txid.toString());

// check your identity
console.log(await client.queryUrl(identityUrl));

// Instantiate a PageSigner that can now sign transactions on behalf of this identity
// (after receiving credits on the identity initial key page)
const keyPageUrl = bookUrl + "/1";
const addCredits2 = {
    recipient: keyPageUrl,
    amount: 1000 * 1e8,
    oracle,
};
res = await client.addCredits(lid.acmeTokenAccount, addCredits2, lid);
await client.waitOnTx(res.txid.toString());
const identityKeyPage = new PageSigner(keyPageUrl, identitySigner);
```

### Manually building and signing a transaction

```js
// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { SendTokens, Transaction, TransactionHeader } from "accumulate.js/core";
import { Client, ED25519KeypairSigner, LiteSigner, signTransaction } from "accumulate.js";

const sender = await LiteSigner.from(ED25519KeypairSigner.generate());

// Build the Payload
const recipient = await LiteSigner.from(ED25519KeypairSigner.generate());
const amount = 10;
const body = new SendTokens({ to: [{ url: recipient.acmeTokenAccount, amount: amount }] });
// Build the transaction header with the transaction principal
// and optionally a timestamp, memo or metadata.
const header = new TransactionHeader({ principal: sender.acmeTokenAccount});

// Finally build the (unsigned yet) transaction
const tx = new Transaction({ body, header });

// Sign with a key pair or manually sign with custom key store, Ledger, etc
const env = await signTransaction(tx, sender, { timestamp: Date.now() });

// Submit the envelope
const client = new Client("https://mainnet.accumulatenetwork.io/v2");
const res = await client.execute(env);
await client.waitOnTx(res.txid.toString());
```
