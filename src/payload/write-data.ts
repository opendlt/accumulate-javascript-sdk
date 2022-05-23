import { hashTree } from "../crypto";
import {
  booleanMarshalBinary,
  bytesMarshalBinary,
  fieldMarshalBinary,
  uvarintMarshalBinary,
} from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type WriteDataArg = {
  data: Uint8Array[];
  scratch?: boolean;
};

export class WriteData extends BasePayload {
  private readonly _data: Uint8Array[];
  private readonly _scratch: boolean;
  private _dataHash?: Buffer;

  constructor(arg: WriteDataArg) {
    super();
    this._data = arg.data;
    this._scratch = arg.scratch || false;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.WriteData, 1));

    forConcat.push(fieldMarshalBinary(2, marshalDataEntry(this._data)));
    if (this._scratch) {
      forConcat.push(booleanMarshalBinary(this._scratch, 3));
    }

    return Buffer.concat(forConcat);
  }

  // Overrides default payload hash with tree hash of the entry
  hash(): Buffer {
    if (this._dataHash) {
      return this._dataHash;
    }

    this._dataHash = hashTree(this._data);

    return this._dataHash;
  }
}

function marshalDataEntry(data: Uint8Array[]): Buffer {
  const forConcat = [];

  // AccumulateDataEntry DataEntryType 2
  forConcat.push(uvarintMarshalBinary(2, 1));
  // Data
  forConcat.push(Buffer.concat(data.map((d) => bytesMarshalBinary(d, 3))));

  return bytesMarshalBinary(Buffer.concat(forConcat));
}
