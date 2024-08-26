import {
  api_v2,
  BaseKey,
  ED25519Key,
  PrivateKey,
  PrivateKeyAddress,
  Signable,
  Signer,
  URL,
} from "accumulate.js";
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
import ecc from "tiny-secp256k1";

class EthKey extends BaseKey {
  constructor(public readonly address: PrivateKey) {
    super(address);
  }

  async signRaw(signature: Signature, message: Signable): Promise<Uint8Array> {
    const sigMdHash = sha256(encode(signature));
    const hash = sha256(Buffer.concat([sigMdHash, message.hash()]));

    // TODO: does this actually work?
    return ecc.sign(hash, this.address.privateKey);
  }
}

/**
 * This is a placeholder and must be replaced with an actual Ethereum public/private
 * key pair.
 */
const ethPubKeyHex = "c0ffeef00d";
const ethPrivKeyHex = "c0ffeef00d";
const ethKey = PrivateKeyAddress.from(
  SignatureType.ETH,
  Buffer.from(ethPubKeyHex, "hex"),
  Buffer.from(ethPrivKeyHex, "hex")
);

const sender = Signer.forPage(URL.parse("me.acme/book/1"), new EthKey(ethKey));
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
