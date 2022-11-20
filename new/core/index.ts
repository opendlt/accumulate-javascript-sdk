export * from "./enums_gen";
export * from "./types_gen";
// export * from "./unions_gen";

export type Fee = number;

import {
  AddCreditsResult,
  BlockValidatorAnchor,
  DirectoryAnchor,
  EmptyResult,
  KeyPage,
  LiteIdentity,
  TransactionType,
  UnknownSigner,
  WriteDataResult,
} from ".";

export type AnchorBody = DirectoryAnchor | BlockValidatorAnchor;
export type Signer = LiteIdentity | KeyPage | UnknownSigner;
export type TransactionResult = AddCreditsResult | EmptyResult | WriteDataResult;
export type AllowedTransactions = TransactionType[];
