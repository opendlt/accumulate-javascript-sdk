import BN from "bn.js";
import { AccURL } from "../acc-url";
import {
  bigNumberMarshalBinary,
  bytesMarshalBinary,
  fieldMarshalBinary,
  hashMarshalBinary,
  stringMarshalBinary,
  uvarintMarshalBinary,
} from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export type SendTokensArg = {
  to: TokenRecipientArg[];
  hash?: Uint8Array;
  meta?: Uint8Array;
};

export type TokenRecipientArg = {
  url: string | AccURL;
  amount: number | BN | string;
};

export type TokenRecipient = {
  url: AccURL;
  amount: BN;
};

export class SendTokens extends BasePayload {
  private readonly _to: TokenRecipient[];
  private readonly _hash?: Uint8Array;
  private readonly _meta?: Uint8Array;

  constructor(arg: SendTokensArg) {
    super();
    if (arg.to.length < 1) {
      throw new Error("Missing at least one recipient");
    }

    this._to = arg.to.map((r) => ({
      url: AccURL.toAccURL(r.url),
      amount: r.amount instanceof BN ? r.amount : new BN(r.amount),
    }));
    this._hash = arg.hash;
    this._meta = arg.meta;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.SendTokens, 1));
    if (this._hash) {
      validateHash(this._hash);
      forConcat.push(hashMarshalBinary(this._hash, 2));
    }
    if (this._meta) {
      forConcat.push(bytesMarshalBinary(this._meta, 3));
    }

    this._to.forEach((recipient) =>
      forConcat.push(fieldMarshalBinary(4, marshalBinaryTokenRecipient(recipient)))
    );

    return Buffer.concat(forConcat);
  }
}

function marshalBinaryTokenRecipient(tr: TokenRecipient): Buffer {
  return bytesMarshalBinary(
    Buffer.concat([stringMarshalBinary(tr.url.toString(), 1), bigNumberMarshalBinary(tr.amount, 2)])
  );
}

function validateHash(bytes: Uint8Array) {
  if (bytes.length !== 32) {
    throw new Error("Invalid hash length");
  }
}
