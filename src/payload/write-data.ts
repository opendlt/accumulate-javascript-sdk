import { bytesMarshalBinary, marshalField, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export type WriteDataArg = {
  extIds: Uint8Array[];
  data: Uint8Array;
};

export class WriteData extends BasePayload {
  private readonly _extIds: Uint8Array[];
  private readonly _data: Uint8Array;

  constructor(arg: WriteDataArg) {
    super();
    this._extIds = arg.extIds;
    this._data = arg.data;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.WriteData, 1));

    forConcat.push(marshalField(2, marshalDataEntry(this._extIds, this._data)));

    return Buffer.concat(forConcat);
  }
}

function marshalDataEntry(extIds: Uint8Array[], data: Uint8Array): Buffer {
  const forConcat = [];

  extIds.forEach((extId) => forConcat.push(bytesMarshalBinary(extId, 1)));
  forConcat.push(bytesMarshalBinary(data, 2));

  return bytesMarshalBinary(Buffer.concat(forConcat));
}
