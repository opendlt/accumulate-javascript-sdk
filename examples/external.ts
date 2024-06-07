// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { Address, api_v2, BaseKey, ED25519Key, PublicKey, Signer, URL } from "accumulate.js";
import { sha256 } from "accumulate.js/lib/common";
import {
  SendTokens,
  Signature,
  SignatureType,
  Transaction,
  TransactionHeader,
} from "accumulate.js/lib/core";
import { encode } from "accumulate.js/lib/encoding";
import { Envelope } from "accumulate.js/lib/messaging";

class ExternalETHKey extends BaseKey {
  constructor(address: PublicKey) {
    super(address);
    if (address.type != SignatureType.ETH) {
      throw new Error(`address is ${address.type}, not ETH`);
    }
  }

  async signRaw(signature: Signature, message: Uint8Array): Promise<Uint8Array> {
    const sigMdHash = sha256(encode(signature));
    const hash = sha256(Buffer.concat([sigMdHash, message]));

    /**
     * External signing hook/logic goes here.
     */
    throw new Error(`TODO: Sign ${hash}`);
  }
}

/**
 * This is a placeholder and must be replaced with an actual Ethereum public
 * key.
 */
const ethKeyHex = "c0ffeef00d";

const ethKey = Address.fromKey(SignatureType.ETH, Buffer.from(ethKeyHex, "hex"));
const sender = Signer.forPage(URL.parse("me.acme/book/1"), new ExternalETHKey(ethKey));
const signerVersion = 5; // Hard code or retrieve via the API

// Build the Payload
const recipient = Signer.forLite(ED25519Key.generate());
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
