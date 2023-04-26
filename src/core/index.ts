export * from "./enums_gen";
export * from "./types_gen";
export * from "./unions_gen";

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
import {
  AddCreditsResultArgsWithType,
  BlockValidatorAnchorArgsWithType,
  BTCLegacySignature,
  BTCLegacySignatureArgsWithType,
  BTCSignature,
  BTCSignatureArgsWithType,
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
