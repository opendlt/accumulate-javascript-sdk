import { Address, URLArgs } from "../address";
import { sha256 } from "../common/crypto";
import { DelegatedSignature, KeySignature, Transaction, UserSignature, VoteType } from "../core";
import { encode } from "../encoding";

export type SignOptions = {
  signer: URLArgs;
  signerVersion: number;
  timestamp?: number;
  vote?: VoteType;
  delegators?: URLArgs[];
};

// From https://stackoverflow.com/a/69328045/762175
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export type PublicKey = WithRequired<Address, "publicKey" | "publicKeyHash">;
export type PrivateKey = WithRequired<PublicKey, "privateKey">;

export interface Key {
  address: PublicKey;
  sign(message: Uint8Array | Transaction, args: SignOptions): Promise<UserSignature>;
}

export abstract class BaseKey implements Key {
  protected constructor(public readonly address: PublicKey) {}

  abstract signRaw(args: { message: Uint8Array; sigMdHash: Uint8Array }): Promise<Uint8Array>;

  async sign(message: Uint8Array | Transaction, opts: SignOptions): Promise<UserSignature> {
    // Initialize the key signature
    const keySig = KeySignature.fromObject({
      type: this.address.type as any,
      publicKey: this.address.publicKey,
      signer: opts.signer,
      signerVersion: opts.signerVersion,
      timestamp: opts.timestamp,
      vote: opts.vote,
    });

    // Apply delegators
    let sig: KeySignature | DelegatedSignature = keySig;
    for (const del of opts.delegators || []) {
      sig = new DelegatedSignature({ signature: sig, delegator: del });
    }

    // The signature MUST be encoded before setting the signature or
    // transaction hash fields
    const sigMdHash = await sha256(encode(sig));

    // Initiate if necessary
    if (message instanceof Transaction) {
      if (!message.header) throw new Error("transaction has no header");
      if (!message.header.initiator) {
        if (!opts.timestamp) throw new Error("cannot initiate without a timestamp");
        message.header.initiator = sigMdHash;
      }

      message = await message.hash();
    }

    // Calculate the raw signature
    const rawSig = await this.signRaw({ message, sigMdHash });

    // Finalize and return the key signature
    keySig.signature = rawSig;
    keySig.transactionHash = message;
    return sig;
  }
}
