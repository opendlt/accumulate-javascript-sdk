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

export type Fee = number;
export type AllowedTransactions = TransactionType[];

export namespace Fee {
  export type Args = Fee | string;

  export function fromObject(obj: Args): Fee {
    if (typeof obj === "string") return Number(obj);
    return obj;
  }
}

export namespace AllowedTransactions {
  export type Args = AllowedTransactions | string[];

  export function fromObject(obj: Args): AllowedTransactions {
    if (!obj.length) return [];
    if (typeof obj[0] === "number") return <number[]>obj;
    return (<string[]>obj).map((v) => TransactionType.byName(v));
  }
}

export type AnchorBody = DirectoryAnchor | BlockValidatorAnchor;
export type Signer = LiteIdentity | KeyPage | UnknownSigner;
export type TransactionResult = AddCreditsResult | EmptyResult | WriteDataResult;

export namespace AnchorBody {
  export type Args =
    | DirectoryAnchor
    | BlockValidatorAnchor
    | DirectoryAnchor.ArgsWithType
    | BlockValidatorAnchor.ArgsWithType;

  export function fromObject(obj: Args): AnchorBody {
    return <AnchorBody>TransactionBody.fromObject(obj);
  }
}

export namespace Signer {
  export type Args =
    | LiteIdentity
    | KeyPage
    | UnknownSigner
    | LiteIdentity.ArgsWithType
    | KeyPage.ArgsWithType
    | UnknownSigner.ArgsWithType;

  export function fromObject(obj: Args): Signer {
    return <Signer>Account.fromObject(obj);
  }
}

export namespace TransactionResult {
  export type Args =
    | AddCreditsResult
    | EmptyResult
    | WriteDataResult
    | AddCreditsResult.ArgsWithType
    | EmptyResult.ArgsWithType
    | WriteDataResult.ArgsWithType;

  export function fromObject(obj: Args): TransactionResult {
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
