import { AccURL } from "../acc-url";
import {
  bytesMarshalBinary,
  fieldMarshalBinary,
  stringMarshalBinary,
  uvarintMarshalBinary,
} from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type CreateKeyPageArg = {
  keys: (string | Uint8Array)[];
  manager?: string | AccURL;
};

export class CreateKeyPage extends BasePayload {
  private readonly _keys: Uint8Array[];
  private readonly _manager?: AccURL;

  constructor(arg: CreateKeyPageArg) {
    super();
    this._keys = arg.keys.map((key) => (key instanceof Uint8Array ? key : Buffer.from(key, "hex")));
    this._manager = arg.manager ? AccURL.toAccURL(arg.manager) : undefined;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateKeyPage, 1));
    this._keys.forEach((key) => forConcat.push(fieldMarshalBinary(2, marshalBinaryKey(key))));
    if (this._manager) {
      forConcat.push(stringMarshalBinary(this._manager.toString(), 3));
    }

    return Buffer.concat(forConcat);
  }
}

function marshalBinaryKey(key: Uint8Array): Buffer {
  return bytesMarshalBinary(bytesMarshalBinary(key, 1));
}
