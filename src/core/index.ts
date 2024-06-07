export * from "./enums_gen";
export * from "./types_gen";
export * from "./unions_gen";

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

import { Buffer } from "../common/buffer";
import { AccumulateDataEntry, DoubleHashDataEntry, FactomDataEntryWrapper } from "./types_gen";

AccumulateDataEntry.prototype.hash = function () {
  if (!this.data) {
    return new Uint8Array();
  }
  return hashTree(this.data);
};

DoubleHashDataEntry.prototype.hash = function () {
  if (!this.data) {
    return new Uint8Array();
  }
  return sha256(hashTree(this.data));
};

FactomDataEntryWrapper.prototype.asBinary = function () {
  const len2buf = (x: number) => new Uint8Array([x >> 8, x]);
  const extIds = Buffer.concat(
    (this.extIds || []).map((x) => {
      return Buffer.concat([len2buf(x.length || 0), x || new Uint8Array()]);
    })
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
  Account,
  AddCreditsResult,
  BlockValidatorAnchor,
  DirectoryAnchor,
  EmptyResult,
  KeyPage,
  LiteIdentity,
  TransactionBody,
  TransactionType,
  UnknownSigner,
  WriteDataResult,
} from ".";
import { AccumulateURL as URL } from "../address/url";
import { hashTree, sha256, sha512 } from "../common";
import {
  AddCreditsResultArgsWithType,
  BlockValidatorAnchorArgsWithType,
  BTCLegacySignature,
  BTCLegacySignatureArgsWithType,
  BTCSignature,
  BTCSignatureArgsWithType,
  DelegatedSignature,
  DelegatedSignatureArgsWithType,
  DirectoryAnchorArgsWithType,
  ED25519Signature,
  ED25519SignatureArgsWithType,
  EmptyResultArgsWithType,
  ETHSignature,
  ETHSignatureArgsWithType,
  KeyPageArgsWithType,
  LegacyED25519Signature,
  LegacyED25519SignatureArgsWithType,
  LiteIdentityArgsWithType,
  RCD1Signature,
  RCD1SignatureArgsWithType,
  UnknownSignerArgsWithType,
  WriteDataResultArgsWithType,
} from "./types_gen";
import { Signature } from "./unions_gen";

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

export type AllowedTransactions = TransactionType[];
export type AllowedTransactionsArgs = AllowedTransactions | string[];

/** @ignore */
export namespace AllowedTransactions {
  export function fromObject(obj: AllowedTransactionsArgs): AllowedTransactions {
    if (!obj.length) return [];
    if (typeof obj[0] === "number") return <number[]>obj;
    return (<string[]>obj).map((v) => TransactionType.byName(v));
  }
}

export type AnchorBody = DirectoryAnchor | BlockValidatorAnchor;
export type AnchorBodyArgs =
  | DirectoryAnchor
  | BlockValidatorAnchor
  | DirectoryAnchorArgsWithType
  | BlockValidatorAnchorArgsWithType;

/** @ignore */
export namespace AnchorBody {
  export function fromObject(obj: AnchorBodyArgs): AnchorBody {
    return <AnchorBody>TransactionBody.fromObject(obj);
  }
}

export type Signer = LiteIdentity | KeyPage | UnknownSigner;
export type SignerArgs =
  | LiteIdentity
  | KeyPage
  | UnknownSigner
  | LiteIdentityArgsWithType
  | KeyPageArgsWithType
  | UnknownSignerArgsWithType;

/** @ignore */
export namespace Signer {
  export function fromObject(obj: SignerArgs): Signer {
    return <Signer>Account.fromObject(obj);
  }
}

export type TransactionResult = AddCreditsResult | EmptyResult | WriteDataResult;
export type TransactionResultArgs =
  | AddCreditsResult
  | EmptyResult
  | WriteDataResult
  | AddCreditsResultArgsWithType
  | EmptyResultArgsWithType
  | WriteDataResultArgsWithType;

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

export type KeySignature =
  | BTCLegacySignature
  | BTCSignature
  | ED25519Signature
  | ETHSignature
  | LegacyED25519Signature
  | RCD1Signature;
export type KeySignatureArgs =
  | BTCLegacySignature
  | BTCSignature
  | ED25519Signature
  | ETHSignature
  | LegacyED25519Signature
  | RCD1Signature
  | BTCLegacySignatureArgsWithType
  | BTCSignatureArgsWithType
  | ED25519SignatureArgsWithType
  | ETHSignatureArgsWithType
  | LegacyED25519SignatureArgsWithType
  | RCD1SignatureArgsWithType;

/** @ignore */
export namespace KeySignature {
  export function fromObject(obj: KeySignatureArgs): KeySignature {
    return <KeySignature>Signature.fromObject(obj);
  }
}

export type UserSignature = KeySignature | DelegatedSignature;
export type UserSignatureArgs =
  | KeySignatureArgs
  | DelegatedSignature
  | DelegatedSignatureArgsWithType;

/** @ignore */
export namespace UserSignature {
  export function fromObject(obj: UserSignatureArgs): UserSignature {
    return <UserSignature>Signature.fromObject(obj);
  }
}
