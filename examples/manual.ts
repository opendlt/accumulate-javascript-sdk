// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { api_v2, ED25519Key, Signer } from "accumulate.js";
import { SendTokens, Transaction, TransactionHeader } from "accumulate.js/lib/core";
import { Envelope } from "accumulate.js/lib/messaging";

(async function () {
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
})();
