/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { KeySignature, Transaction } from ".././core";
import { encode } from ".././encoding";
import { Envelope } from ".././messaging";
import { sha256 } from "../crypto";
import { PageSigner } from "./signer";

export * from "./ed25519-keypair";
export * from "./ed25519-keypair-signer";
export * from "./rcd1-keypair-signer";
export * from "./signer";

export async function signTransaction(
  transaction: Transaction,
  signer: PageSigner,
  opts: { timestamp?: number } = {}
): Promise<Envelope> {
  if (!transaction.header) throw new Error("transaction has no header");
  if (!transaction.header.initiator) {
    if (!opts.timestamp) throw new Error("cannot initiate without a timestamp");
    setInitiator(transaction, signer, opts.timestamp);
  }

  const sig = await doSign(transaction, signer, opts.timestamp);
  return new Envelope({ transaction: [transaction], signatures: [sig] });
}

function setInitiator(transaction: Transaction, signer: PageSigner, timestamp: number) {
  const sig = signer.makeSignature({ timestamp });
  const hash = sha256(encode(sig)); // Simple hash
  transaction.header!.initiator = hash;
}

async function doSign(
  transaction: Transaction,
  signer: PageSigner,
  timestamp?: number
): Promise<KeySignature> {
  // TODO this is only valid for ED25519 and RCD1 and will not work for ETH or BTC signatures
  const sig = signer.makeSignature({ timestamp });
  const sigHash = sha256(encode(sig));
  const txnHash = transaction.hash();
  const hash = sha256(Buffer.concat([sigHash, txnHash]));

  sig.transactionHash = txnHash;
  sig.signature = await signer.sign(hash);
  return sig;
}
