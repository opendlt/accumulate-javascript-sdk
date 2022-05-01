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
}

function marshalDataEntry(data: Uint8Array[]): Buffer {
  const forConcat = data.map((d) => bytesMarshalBinary(d, 1));
  return bytesMarshalBinary(Buffer.concat(forConcat));
}
