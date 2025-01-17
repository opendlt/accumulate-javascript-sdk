import * as secp256k1 from "@noble/secp256k1";
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
import { BIP44, randomMnemonic } from "accumulate.js/lib/bip44";
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

class EthKey extends BaseKey {
  constructor(public readonly address: PrivateKey) {
    super(address);
  }

  // signRaw returns the signature in R (32 bytes) S (32 bytes) V (1 byte) format
  async signRaw(signature: Signature, message: Signable): Promise<Uint8Array> {
    const sigMdHash = sha256(encode(signature));
    const messageHash = message.hash();
    const hash = sha256(new Uint8Array([...sigMdHash, ...messageHash]));

    const signatureObj = await secp256k1.sign(hash, this.address.privateKey, {
      lowS: true,
      recovered: true,
    });

    return new Uint8Array([...signatureObj[0].slice(0, 64), signatureObj[1]]);
  }
}

// Generate a key using our BIP44 implementation
const mnemonic = randomMnemonic();
const wallet = new BIP44(SignatureType.ETH, mnemonic);
const key = wallet.getKey(0, 0, 0); // account 0, change 0, address 0

const ethKey = PrivateKeyAddress.from(
  SignatureType.ETH,
  key.privateKey,
  key.privateKey, // Note: You'll need to derive the public key from private key
);

const sender = Signer.forPage(URL.parse("me.acme/book/1"), new EthKey(ethKey));
const signerVersion = 5;

// Build the Payload
const recipient = Signer.forLite(ED25519Key.generate());
const amount = 10;
const body = new SendTokens({ to: [{ url: recipient.url.join("ACME"), amount: amount }] });
const header = new TransactionHeader({ principal: sender.url.join("ACME") });
const tx = new Transaction({ body, header });

// Sign and submit
async function submitTransaction() {
  const sig = await sender.sign(tx, { timestamp: Date.now(), signerVersion });
  const env = new Envelope({ transaction: [tx], signatures: [sig] });

  const client = new api_v2.Client("https://mainnet.accumulatenetwork.io/v2");
  const res = await client.execute(env);
  await client.waitOnTx(res.txid.toString());
}

submitTransaction().catch(console.error);
