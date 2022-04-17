import { bytesMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type UpdateKeyArg = {
  newKeyHash: Uint8Array;
};

export class UpdateKey extends BasePayload {
  private readonly _newKeyHash: Uint8Array;

  constructor(arg: UpdateKeyArg) {
    super();
    this._newKeyHash = arg.newKeyHash;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.UpdateKey, 1));
    forConcat.push(bytesMarshalBinary(this._newKeyHash, 2));

    return Buffer.concat(forConcat);
  }
}
