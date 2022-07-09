import { hashTree, sha256 } from "../crypto";
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
  writeToState?: boolean;
};

export class WriteData extends BasePayload {
  private readonly _data: Uint8Array[];
  private readonly _scratch: boolean;
  private readonly _writeToState: boolean;
  private _customHash?: Buffer;

  constructor(arg: WriteDataArg) {
    super();
    this._data = arg.data;
    this._scratch = arg.scratch || false;
    this._writeToState = arg.writeToState || false;
  }

  protected _marshalBinary(withoutEntry = false): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.WriteData, 1));

    if (!withoutEntry) {
      forConcat.push(fieldMarshalBinary(2, marshalDataEntry(this._data)));
    }

    if (this._scratch) {
      forConcat.push(booleanMarshalBinary(this._scratch, 3));
    }
    if (this._writeToState) {
      forConcat.push(booleanMarshalBinary(this._writeToState, 4));
    }

    return Buffer.concat(forConcat);
  }

  // Overrides default payload hash with tree hash of the entry
  hash(): Buffer {
    if (this._customHash) {
      return this._customHash;
    }

    const bodyHash = sha256(this._marshalBinary(true));
    const dataHash = hashTree(this._data);

    this._customHash = sha256(Buffer.concat([bodyHash, dataHash]));

    return this._customHash;
  }
}

function marshalDataEntry(data: Uint8Array[]): Buffer {
  const forConcat = [];

  // AccumulateDataEntry DataEntryType 2
  forConcat.push(uvarintMarshalBinary(2, 1));
  // Data
  forConcat.push(Buffer.concat(data.map((d) => bytesMarshalBinary(d, 2))));

  return bytesMarshalBinary(Buffer.concat(forConcat));
}
