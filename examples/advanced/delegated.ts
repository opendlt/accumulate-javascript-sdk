// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { api_v2, ED25519Key, Signer } from "accumulate.js";
import { Transaction } from "accumulate.js/core";
import { Envelope } from "accumulate.js/messaging";

// An example transaction
const tx = new Transaction({
  header: {
    principal: "foo.acme/tokens",
  },
  body: {
    type: "sendTokens",
    to: [
      {
        url: "alice.acme/tokens",
        amount: 10,
      },
    ],
  },
});

// Sign with foo <- bar <- baz
const sender = Signer.forPage("foo.acme/book/1", ED25519Key.generate()).withVersion(1);
const sig = await sender.sign(tx, {
  timestamp: Date.now(),
  delegators: ["bar.acme/book/1", "baz.acme/book/1"],
});

// Submit the envelope
const env = new Envelope({ transaction: [tx], signatures: [sig] }).asObject();
console.log("<", JSON.stringify(env, null, "  "));

const client = new api_v2.Client("https://kermit.accumulatenetwork.io/v2");
await client
  .call("execute-direct", { envelope: env })
  .then((x) => console.log(">", JSON.stringify(x, null, "  ")))
  .catch((x) => console.log(">", JSON.stringify(x, null, "  ")));
