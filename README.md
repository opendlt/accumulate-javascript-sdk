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

Demo of some of the main APIs of Accumulate:

```js
import { api_v2, ED25519Key, Signer } from "accumulate.js";

const client = new api_v2.Client("https://mainnet.accumulatenetwork.io/v2");

// Generate a random Signer (this is only local, until that account receive its first tokens)
const lid = await Signer.forLite(await ED25519Key.generate());
// Request some ACME token to get started from the faucet
let res = await client.faucet(lid.url.join("ACME"));
await client.waitOnTx(res.txid.toString());

// check the ACME token balance
console.log(await client.queryUrl(lid.url.join("ACME")));

// Convert some tokens into credits necessary to perform operations on Accumulate
const oracle = await client.queryAcmeOracle();
const addCredits = {
  recipient: lid.url,
  amount: 1000 * 1e8,
  oracle,
};
res = await client.addCredits(lid.url.join("ACME"), addCredits, lid);
await client.waitOnTx(res.txid.toString());

// check the credits balance
console.log(await client.queryUrl(lid.url));

// Send some tokens to another random Lite ACME token Account
const recipient = await Signer.forLite(await ED25519Key.generate());
const sendTokens = { to: [{ url: recipient.url.join("ACME"), amount: 12 }] };
res = await client.sendTokens(lid.url.join("ACME"), sendTokens, lid);
await client.waitOnTx(res.txid.toString());

// Now with the credits we can create an Accumulate Digital Identifier (ADI)
// which is one of the fundamental feature of the network

const identitySigner = await ED25519Key.generate(); // Root signer that will control the identity
const identityUrl = "acc://my-own-identity.acme";
const bookUrl = identityUrl + "/my-book";

const createIdentity = {
  url: identityUrl,
  keyHash: identitySigner.address.publicKeyHash,
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
res = await client.addCredits(lid.url.join("ACME"), addCredits2, lid);
await client.waitOnTx(res.txid.toString());
const identityKeyPage = await Signer.forPage(keyPageUrl, identitySigner);
```

### Manually building and signing a transaction

```js
// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { api_v2, ED25519Key, Signer } from "accumulate.js";
import { SendTokens, Transaction, TransactionHeader } from "accumulate.js/core";
import { Envelope } from "accumulate.js/messaging";

const sender = await Signer.forLite(await ED25519Key.generate());

// Build the Payload
const recipient = await Signer.forLite(await ED25519Key.generate());
const amount = 10;
const body = new SendTokens({ to: [{ url: recipient.url.join("ACME"), amount: amount }] });
// Build the transaction header with the transaction principal
// and optionally a timestamp, memo or metadata.
const header = new TransactionHeader({ principal: sender.url.join("ACME") });

// Finally build the (unsigned yet) transaction
const tx = new Transaction({ body, header });

// Sign with a key pair or manually sign with custom key store, Ledger, etc
const sig = await sender.sign(tx, { timestamp: Date.now() });
const env = new Envelope({ transaction: [tx], signatures: [sig] });

// Submit the envelope
const client = new api_v2.Client("https://mainnet.accumulatenetwork.io/v2");
const res = await client.execute(env);
await client.waitOnTx(res.txid.toString());
```

## Browser Usage

To use accumulate.js in a browser environment, you have two options:

### Option 1: Using a Bundler (Recommended)

If you're using a bundler (webpack, rollup, etc.), you can import the library normally:

```js
import { api_v2, ED25519Key, Signer } from "accumulate.js";
```

Make sure your bundler is configured to handle Node.js polyfills (buffer, crypto, etc.). You may need to add the following polyfills to your bundler configuration:

- buffer
- crypto
- stream
- assert
- path
- util

### Option 2: Direct Browser Usage

For direct browser usage without a bundler, include the browser bundle and necessary polyfills:

```html
<!-- Include necessary polyfills -->
<script src="https://bundle.run/buffer"></script>
<script src="https://bundle.run/process"></script>

<!-- Include accumulate.js browser bundle -->
<script src="path/to/accumulate.browser.js"></script>

<script>
  // The library is available as 'accumulate'
  const { api_v2, ED25519Key, Signer } = accumulate;

  // Use the library as shown in the quick start tutorial
  const client = new api_v2.Client("https://mainnet.accumulatenetwork.io/v2");
  // ... rest of your code
</script>
```
