import { bytesMarshalBinary, fieldMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type CreateKeyPageArg = {
  keys: (string | Uint8Array)[];
};

export class CreateKeyPage extends BasePayload {
  private readonly _keys: Uint8Array[];

  constructor(arg: CreateKeyPageArg) {
    super();
    this._keys = arg.keys.map((key) => (key instanceof Uint8Array ? key : Buffer.from(key, "hex")));
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateKeyPage, 1));
    this._keys.forEach((key) => forConcat.push(fieldMarshalBinary(2, marshalBinaryKey(key))));

    return Buffer.concat(forConcat);
  }
}

function marshalBinaryKey(key: Uint8Array): Buffer {
  return bytesMarshalBinary(bytesMarshalBinary(key, 1));
}
