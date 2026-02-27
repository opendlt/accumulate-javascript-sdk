// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { Address, api_v2, ED25519Key, Signer, SimpleExternalKey, URL } from "accumulate.js";
import { SendTokens, SignatureType, Transaction, TransactionHeader } from "accumulate.js/core";
import { Envelope } from "accumulate.js/messaging";

/**
 * Example private key for demonstration - in production this would be stored securely
 * and managed by external signing infrastructure (hardware wallet, secure enclave, etc.)
 */
const ethPrivateKeyHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

/**
 * External signing function that implements proper secp256k1 signing
 * In production, this would interface with your secure signing infrastructure
 */
const signExternal = async (hash: Uint8Array): Promise<Uint8Array> => {
  const secp256k1 = await import("@noble/secp256k1");

  const signature = await secp256k1.signAsync(hash, new Uint8Array(Buffer.from(ethPrivateKeyHex, 'hex')), {
    lowS: true,
  });

  // Convert r and s to 32-byte arrays and append recovery ID (Ethereum format)
  const r = signature.r.toString(16).padStart(64, '0');
  const s = signature.s.toString(16).padStart(64, '0');
  const recoveryId = signature.recovery;

  return new Uint8Array([
    ...Buffer.from(r, 'hex'),
    ...Buffer.from(s, 'hex'),
    recoveryId
  ]);
};

async function main() {
  // Generate the corresponding public key for the private key
  const secp256k1 = await import("@noble/secp256k1");
  const fullPublicKey = secp256k1.getPublicKey(new Uint8Array(Buffer.from(ethPrivateKeyHex, 'hex')), false);
  const ethKeyHex = Buffer.from(fullPublicKey.slice(1)).toString('hex'); // Remove 0x04 prefix

  const ethKey = Address.fromKey(SignatureType.ETH, Buffer.from(ethKeyHex, "hex"));
  const sender = Signer.forPage(
    URL.parse("me.acme/book/1"),
    new SimpleExternalKey(ethKey, signExternal),
  );
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

  console.log("Transaction successfully signed with external key!");
  console.log("Envelope created with external signature");

  // Submit the envelope
  const client = new api_v2.Client("https://kermit.accumulatenetwork.io/v2");
  const res = await client.execute(env);
  await client.waitOnTx(res.txid.toString());
}

main().catch(console.error);
