import { AccURL } from "../acc-url";
import { TxType } from "../tx-types";
import { uvarintMarshalBinary, stringMarshalBinary, bytesMarshalBinary } from "../encoding";
import { u64 } from "../bigint";
import { Payload } from "../payload";

export type SendTokensArg = {
  to: TokenRecipientArg[];
  hash?: Uint8Array;
  meta?: Uint8Array;
};

export type TokenRecipientArg = {
  url: string | AccURL;
  amount: number | u64;
};

export type TokenRecipient = {
  url: AccURL;
  amount: u64;
};

export class SendTokens implements Payload {
  private readonly _to: TokenRecipient[];
  private readonly _hash?: Uint8Array;
  private readonly _meta?: Uint8Array;
  private _binary?: Buffer;

  constructor(arg: SendTokensArg) {
    this._to = arg.to.map((r) => ({
      url: r.url instanceof AccURL ? r.url : AccURL.parse(r.url),
      amount: r.amount instanceof u64 ? r.amount : new u64(r.amount),
    }));
    this._hash = arg.hash;
    this._meta = arg.meta;
  }

  marshalBinary(): Buffer {
    if (this._binary) {
      return this._binary;
    }

    this._binary = this._marshalBinary();

    return this._binary;
  }

  private _marshalBinary() {
    const hash = this._hash || Buffer.alloc(32, 0);
    validateHash(hash);
    if (this._to.length < 1) {
      throw new Error("Missing at least one recipient");
    }

    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TxType.SendTokens));
    forConcat.push(hash);
    forConcat.push(bytesMarshalBinary(this._meta || Buffer.allocUnsafe(0)));
    forConcat.push(uvarintMarshalBinary(this._to.length));

    this._to.forEach((recipient) => forConcat.push(marshalBinaryTokenRecipient(recipient)));

    return Buffer.concat(forConcat);
  }
}

function marshalBinaryTokenRecipient(tr: TokenRecipient): Buffer {
  return Buffer.concat([stringMarshalBinary(tr.url.toString()), uvarintMarshalBinary(tr.amount)]);
}

function validateHash(bytes: Uint8Array) {
  if (bytes.length !== 32) {
    throw new Error("Invalid hash length");
  }
}
