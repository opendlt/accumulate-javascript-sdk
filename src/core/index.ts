export * from "./enums_gen.js";
export * from "./types_gen.js";
export * from "./unions_gen.js";

declare module "./types_gen" {
  export interface AccumulateDataEntry {
    hash(): Uint8Array;
  }

  export interface DoubleHashDataEntry {
    hash(): Uint8Array;
  }

  export interface FactomDataEntryWrapper {
    hash(): Uint8Array;
    asBinary(): Uint8Array;
  }
}

import { Buffer } from "../common/buffer.js";
import { AccumulateDataEntry, DoubleHashDataEntry, FactomDataEntryWrapper } from "./types_gen.js";

AccumulateDataEntry.prototype.hash = function () {
  if (!this.data) {
    return new Uint8Array();
  }
  return hashTree(this.data.map((v) => v || new Uint8Array()));
};

DoubleHashDataEntry.prototype.hash = function () {
  if (!this.data) {
    return new Uint8Array();
  }
  return sha256(hashTree(this.data.map((v) => v || new Uint8Array())));
};

FactomDataEntryWrapper.prototype.asBinary = function () {
  const len2buf = (x: number) => new Uint8Array([x >> 8, x]);
  const extIds = Buffer.concat(
    (this.extIds || []).map((x) => {
      return Buffer.concat([len2buf(x?.length || 0), x || new Uint8Array()]);
    }),
  );

  return Buffer.concat([
    Buffer.from([0]),
    Buffer.from(this.accountId || new Uint8Array(32)),
    len2buf(extIds.length),
    extIds,
    this.data || new Uint8Array(),
  ]);
};

FactomDataEntryWrapper.prototype.hash = function () {
  const data = this.asBinary();
  const sum = sha512(data);
  const salted = Buffer.concat([sum, data]);
  return sha256(salted);
};

/* eslint-disable @typescript-eslint/no-namespace */

import {
  AddCreditsResult,
  BlockValidatorAnchor,
  DirectoryAnchor,
  EmptyResult,
  KeyPage,
  LiteIdentity,
  UnknownSigner,
  WriteDataResult,
} from "./types_gen.js";
import { Account, TransactionBody } from "./unions_gen.js";
import { AllowedTransactionBit, TransactionType } from "./enums_gen.js";
import { AccumulateURL as URL } from "../address/url.js";
import { hashTree, sha256, sha512 } from "../common/index.js";
import { DelegatedSignature, registerCoreTypes } from "./types_gen.js";
import { Signature } from "./unions_gen.js";

/**
 * The URL of the ACME token
 */
export const ACME_TOKEN_URL = URL.parse("acc://ACME");

/**
 * The URL of the DN
 */
export const DN_URL = URL.parse("acc://dn.acme");

/**
 * The URL of the anchors
 */
export const ANCHORS_URL = DN_URL.join("anchors");

export type Fee = number;
export type FeeArgs = Fee | string;

/** @ignore */
export namespace Fee {
  export function getName(fee: Fee) {
    return fee;
  }

  export function fromObject(obj: FeeArgs): Fee {
    if (typeof obj === "string") return Number(obj);
    return obj;
  }
}

/**
 * A set of AllowedTransactionBit, as Go's protocol.AllowedTransactions holds it: a uint64 bitmask, the OR of
 * 1 << bit. Its JSON is the list of bit names; its binary form is the mask, written as an enum varint. (It used to be
 * modelled here as a list of TransactionType, which named the wrong enum and could not be encoded.)
 */
export type AllowedTransactions = number;
export type AllowedTransactionsArgs = AllowedTransactions | (AllowedTransactionBit | string)[];

/** @ignore */
export namespace AllowedTransactions {
  export function fromObject(obj: AllowedTransactionsArgs): AllowedTransactions {
    if (typeof obj === "number") return obj;
    const bits = new Set<number>();
    for (const v of obj) {
      const bit = AllowedTransactionBit.fromObject(v);
      // A JavaScript number holds a bitmask exactly up to bit 52; the protocol defines bits 1 and 2.
      if (bit > 52) throw new Error(`AllowedTransactionBit ${bit} does not fit a JavaScript number`);
      bits.add(bit);
    }
    let mask = 0;
    for (const bit of bits) mask += 2 ** bit;
    return mask;
  }

  /** The bit names, in ascending order, as Go's AllowedTransactions.MarshalJSON gives them. */
  export function unpack(mask: AllowedTransactions): string[] {
    const names: string[] = [];
    for (let bit = 0; bit <= 52 && 2 ** bit <= mask; bit++) {
      if (Math.floor(mask / 2 ** bit) % 2 === 1) names.push(AllowedTransactionBit.getName(bit));
    }
    return names;
  }
}

type AsObject<T> = T extends { asObject(): infer P } ? P : never;

export type AnchorBody = DirectoryAnchor | BlockValidatorAnchor;
export type AnchorBodyArgs = AnchorBody | AsObject<AnchorBody>;

/** @ignore */
export namespace AnchorBody {
  export function fromObject(obj: AnchorBodyArgs): AnchorBody {
    return <AnchorBody>TransactionBody.fromObject(obj);
  }
}

export type Signer = LiteIdentity | KeyPage | UnknownSigner;
export type SignerArgs = Signer | AsObject<Signer>;

/** @ignore */
export namespace Signer {
  export function fromObject(obj: SignerArgs): Signer {
    return <Signer>Account.fromObject(obj);
  }
}

export type TransactionResult = AddCreditsResult | EmptyResult | WriteDataResult;
export type TransactionResultArgs = TransactionResult | AsObject<TransactionResult>;

/** @ignore */
export namespace TransactionResult {
  export function fromObject(obj: TransactionResultArgs): TransactionResult {
    if (obj instanceof AddCreditsResult) return obj;
    if (obj instanceof EmptyResult) return obj;
    if (obj instanceof WriteDataResult) return obj;

    switch (obj.type) {
      case (TransactionType.AddCredits, "addCredits"):
        return new AddCreditsResult(obj);
      case (TransactionType.Unknown, "unknown"):
        return new EmptyResult(obj);
      case (TransactionType.WriteData, "writeData"):
        return new WriteDataResult(obj);
    }

    throw new Error(`Unknown signature '${obj.type}'`);
  }
}

export type KeySignature = Extract<Signature, { publicKey?: Uint8Array }>;
export type KeySignatureArgs = KeySignature | AsObject<KeySignature>;

/** @ignore */
export namespace KeySignature {
  export function fromObject(obj: KeySignatureArgs): KeySignature {
    return <KeySignature>Signature.fromObject(obj);
  }
}

export type UserSignature = KeySignature | DelegatedSignature;
export type UserSignatureArgs = UserSignature | AsObject<UserSignature>;

/** @ignore */
export namespace UserSignature {
  export function fromObject(obj: UserSignatureArgs): UserSignature {
    return <UserSignature>Signature.fromObject(obj);
  }
}

// The generated classes in ./types_gen.ts resolve these hand-written types lazily (a direct import would be circular).
registerCoreTypes({ Fee, AllowedTransactions, AnchorBody, TransactionResult, Signer });
