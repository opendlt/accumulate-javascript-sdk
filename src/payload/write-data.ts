import { bytesMarshalBinary, uvarintMarshalBinary } from "../encoding";
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
    forConcat.push(uvarintMarshalBinary(TransactionType.WriteData));
    forConcat.push(uvarintMarshalBinary(this._extIds.length));

    this._extIds.forEach((extId) => forConcat.push(bytesMarshalBinary(extId)));

    forConcat.push(bytesMarshalBinary(this._data));

    return Buffer.concat(forConcat);
  }
}
