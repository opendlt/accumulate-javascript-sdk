// Use dynamic import for secp256k1 to ensure ES module compatibility
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
import { BIP44, randomMnemonic } from "accumulate.js/bip44";
import { sha256 } from "accumulate.js/common";
import {
  SendTokens,
  Signature,
  SignatureType,
  Transaction,
  TransactionHeader,
} from "accumulate.js/core";
import { encode } from "accumulate.js/encoding";
import { Envelope } from "accumulate.js/messaging";

class EthKey extends BaseKey {
  constructor(public readonly address: PrivateKey) {
    super(address);
  }

  // signRaw returns the signature in R (32 bytes) S (32 bytes) V (1 byte) format
  async signRaw(signature: Signature, message: Signable): Promise<Uint8Array> {
    const sigMdHash = sha256(encode(signature));
    const messageHash = message.hash();
    const hash = sha256(new Uint8Array([...sigMdHash, ...messageHash]));

    // Use dynamic import for secp256k1 ES module compatibility
    const secp256k1 = await import("@noble/secp256k1");
    const ecdsaSignature = await secp256k1.signAsync(hash, this.address.privateKey, {
      lowS: true,
    });

    // Convert r and s to 32-byte arrays and append recovery ID
    const r = (ecdsaSignature as any).r.toString(16).padStart(64, '0');
    const s = (ecdsaSignature as any).s.toString(16).padStart(64, '0');
    const recoveryId = (ecdsaSignature as any).recovery;

    return new Uint8Array([
      ...Buffer.from(r, 'hex'),
      ...Buffer.from(s, 'hex'),
      recoveryId
    ]);
  }
}

async function main() {
  // Generate a key using our BIP44 implementation
  const mnemonic = randomMnemonic();
  const wallet = new BIP44(SignatureType.ETH, mnemonic);
  const key = wallet.getKey(0, 0, 0); // account 0, change 0, address 0

  // Derive the public key from the private key for Ethereum
  const secp256k1 = await import("@noble/secp256k1");
  const fullPublicKey = secp256k1.getPublicKey(key.privateKey, false); // uncompressed format
  // Remove the 0x04 prefix to get 64 bytes as expected by Accumulate
  const publicKey = fullPublicKey.slice(1);

  const ethKey = PrivateKeyAddress.from(
    SignatureType.ETH,
    publicKey,
    key.privateKey,
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
  const sig = await sender.sign(tx, { timestamp: Date.now(), signerVersion });
  const env = new Envelope({ transaction: [tx], signatures: [sig] });

  const client = new api_v2.Client("https://kermit.accumulatenetwork.io/v2");
  const res = await client.execute(env);
  await client.waitOnTx(res.txid.toString());
}

main().catch(console.error);
