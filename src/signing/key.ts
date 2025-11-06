import { Address, URLArgs } from "../address/index.js";
import { sha256 } from "../common/index.js";
import {
  DelegatedSignature,
  KeySignature,
  Signature,
  Transaction,
  UserSignature,
  VoteType,
} from "../core/index.js";
import { encode } from "../encoding/index.js";

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
export type Signable = { hash(): Uint8Array };

export interface Key {
  address: PublicKey;
  // This is async to allow asynchronous implementations such as hardware
  sign(message: Signable, args: SignOptions): Promise<UserSignature>;
}

export abstract class BaseKey implements Key {
  protected constructor(public readonly address: PublicKey) {}

  abstract signRaw(signature: Signature, message: Signable): Promise<Uint8Array>;

  protected initSignature(_: Signable, opts: SignOptions): Promise<KeySignature> {
    return Promise.resolve(
      KeySignature.fromObject({
        type: this.address.type as any,
        publicKey: this.address.publicKey,
        signer: opts.signer,
        signerVersion: opts.signerVersion,
        timestamp: opts.timestamp,
        vote: opts.vote,
      }),
    );
  }

  async sign(message: Signable, opts: SignOptions): Promise<UserSignature> {
    // Initialize the key signature
    const keySig = await this.initSignature(message, opts);

    // Apply delegators
    let sig: KeySignature | DelegatedSignature = keySig;
    for (const del of opts.delegators || []) {
      sig = new DelegatedSignature({ signature: sig, delegator: del });
    }

    // The signature MUST be encoded before setting the signature or
    // transaction hash fields
    const sigMdHash = sha256(encode(sig));

    // Initiate if necessary
    const transaction = message instanceof Transaction ? message : undefined;
    if (transaction) {
      if (!transaction.header) throw new Error("transaction has no header");
      if (!transaction.header.initiator) {
        if (!opts.timestamp) throw new Error("cannot initiate without a timestamp");
        transaction.header.initiator = sigMdHash;
      }
    }

    // Calculate the raw signature
    const rawSig = await this.signRaw(sig, message);

    // Finalize and return the key signature
    keySig.signature = rawSig;
    keySig.transactionHash = message.hash();
    return sig;
  }
}

export class SimpleExternalKey extends BaseKey {
  readonly #sign: (hash: Uint8Array) => Promise<Uint8Array>;
  constructor(address: PublicKey, sign: (hash: Uint8Array) => Promise<Uint8Array>) {
    super(address);
    this.#sign = sign;
  }

  async signRaw(signature: Signature, message: Signable): Promise<Uint8Array> {
    const sigMdHash = sha256(encode(signature));
    const hash = sha256(Buffer.concat([sigMdHash, message.hash()]));
    return this.#sign(hash);
  }
}
