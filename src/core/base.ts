/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Buffer, sha256 } from "../common";
import { encode } from "../encoding";
import { TransactionType } from "./enums_gen";
import { TransactionHeader } from "./types_gen";
import { TransactionBody } from "./unions_gen";

export abstract class TransactionBase {
  private _hash?: Uint8Array;
  public header?: TransactionHeader;
  public body?: TransactionBody;

  hash() {
    if (this._hash) return this._hash;

    if (!this.header) throw new Error(`invalid transaction: missing header`);
    if (!this.body) throw new Error(`invalid transaction: missing body`);

    this._hash = sha256(Buffer.concat([sha256(encode(this.header)), hashBody(this.body)]));
    return this._hash;
  }
}

export function hashBody(body: TransactionBody) {
  switch (body.type) {
    case TransactionType.WriteData:
    case TransactionType.WriteDataTo:
    case TransactionType.SyntheticWriteData:
    case TransactionType.SystemWriteData: {
      if (!body.entry) throw new Error(`invalid ${body.type}: missing entry`);
      if (!body.entry.data) throw new Error(`invalid ${body.type}: missing entry data`);

      const copy = body.copy();
      delete copy.entry;

      const withoutEntry = sha256(encode(copy));
      const entryHash = body.entry.hash();
      return sha256(Buffer.concat([withoutEntry, entryHash]));
    }

    default:
      return sha256(encode(body));
  }
}
