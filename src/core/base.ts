import { hashTree, sha256 } from "../../src/crypto";
import { encode } from "../encoding";
import { DataEntryType, TransactionType } from "./enums_gen";
import { TransactionHeader } from "./types_gen";
import { TransactionBody } from "./unions_gen";

export abstract class TransactionBase {
  private _hash?: Buffer;
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
      if (body.entry.type != DataEntryType.Accumulate)
        throw new Error(`cannot hash ${body.type}: ${body.entry.type} entries are not supported`);
      if (!body.entry.data) throw new Error(`invalid ${body.type}: missing entry data`);

      const copy = body.copy();
      delete copy.entry;

      return sha256(
        Buffer.concat([sha256(encode(copy)), hashTree(body.entry.data.map((x) => sha256(x)))])
      );
    }

    default:
      return sha256(encode(body));
  }
}
