// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import {
  api_v2,
  BaseKey,
  ED25519Key,
  PublicKey,
  PublicKeyAddress,
  Signer,
  URL,
} from "accumulate.js";
import { sha256 } from "accumulate.js/lib/common/crypto";
import { SendTokens, SignatureType, Transaction, TransactionHeader } from "accumulate.js/lib/core";
import { Envelope } from "accumulate.js/lib/messaging";

class ExternalETHKey extends BaseKey {
  constructor(address: PublicKey) {
    super(address);
    if (address.type != SignatureType.ETH) {
      throw new Error(`address is ${address.type}, not ETH`);
    }
  }

  async signRaw(args: { message: Uint8Array; sigMdHash: Uint8Array }): Promise<Uint8Array> {
    const hash = await sha256(Buffer.concat([args.sigMdHash, args.message]));
    /*
     * External signing hook/logic goes here
     */
    throw new Error();
  }
}

async function main(ethKey: PublicKeyAddress) {
  const sender = await Signer.forPage(URL.parse("me.acme/book/1"), new ExternalETHKey(ethKey));
  const signerVersion = 5; // Hard code or retrieve via the API

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
  const sig = await sender.sign(tx, { timestamp: Date.now(), signerVersion });
  const env = new Envelope({ transaction: [tx], signatures: [sig] });

  // Submit the envelope
  const client = new api_v2.Client("https://mainnet.accumulatenetwork.io/v2");
  const res = await client.execute(env);
  await client.waitOnTx(res.txid.toString());
}
