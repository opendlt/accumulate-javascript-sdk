import { bytesMarshalBinary, marshalField, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export type WriteDataArg = {
  data: Uint8Array[];
};

export class WriteData extends BasePayload {
  private readonly _data: Uint8Array[];

  constructor(arg: WriteDataArg) {
    super();
    this._data = arg.data;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.WriteData, 1));

    forConcat.push(marshalField(2, marshalDataEntry(this._data)));

    return Buffer.concat(forConcat);
  }
}

function marshalDataEntry(data: Uint8Array[]): Buffer {
  const forConcat = data.map((d) => bytesMarshalBinary(d, 1));
  return bytesMarshalBinary(Buffer.concat(forConcat));
}
