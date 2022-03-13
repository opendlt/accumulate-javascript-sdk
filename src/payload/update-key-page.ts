import assert from "assert";
import { stringMarshalBinary } from "..";
import { AccURL } from "../acc-url";
import { bytesMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export enum KeyPageOperation {
  UpdateKey = 1,
  RemoveKey,
  AddKey,
  SetThreshold,
}

export type UpdateKeyPageArg = {
  operation: KeyPageOperation;
  key?: string | Uint8Array;
  newKey?: string | Uint8Array;
  owner?: string | AccURL;
  threshold?: number;
};

export class UpdateKeyPage extends BasePayload {
  private readonly _operation: KeyPageOperation;
  private readonly _key?: Uint8Array;
  private readonly _newKey?: Uint8Array;
  private readonly _owner?: AccURL;
  private readonly _threshold?: number;

  constructor(arg: UpdateKeyPageArg) {
    super();
    this._operation = arg.operation;

    switch (arg.operation) {
      case KeyPageOperation.UpdateKey:
        assert(arg.key, "old key to update missing");
        assert(arg.newKey, "new key to update missing");
        break;
      case KeyPageOperation.AddKey:
        assert(!arg.key, "key should not be set");
        assert(arg.newKey, "new key to add missing");
        break;
      case KeyPageOperation.RemoveKey:
        assert(arg.key, "key to remove missing");
        assert(!arg.newKey, "new key should not be set");
        break;
    }

    if (arg.key) {
      this._key = arg.key instanceof Uint8Array ? arg.key : Buffer.from(arg.key, "hex");
    }
    if (arg.newKey) {
      this._newKey = arg.newKey instanceof Uint8Array ? arg.newKey : Buffer.from(arg.newKey, "hex");
    }
    if (arg.owner) {
      this._owner = AccURL.toAccURL(arg.owner);
    }
    this._threshold = arg.threshold;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.UpdateKeyPage, 1));
    forConcat.push(uvarintMarshalBinary(this._operation, 2));

    if (this._key) {
      forConcat.push(bytesMarshalBinary(this._key, 3));
    }
    if (this._newKey) {
      forConcat.push(bytesMarshalBinary(this._newKey, 4));
    }
    if (this._owner) {
      forConcat.push(stringMarshalBinary(this._owner.toString(), 5));
    }
    if (this._threshold) {
      forConcat.push(uvarintMarshalBinary(this._threshold, 6));
    }

    return Buffer.concat(forConcat);
  }
}
