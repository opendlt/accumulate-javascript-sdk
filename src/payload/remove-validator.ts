import { AccURL } from "../acc-url";
import { bytesMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type RemoveValidatorArg = {
  publicKey: Uint8Array;
  owner?: string | AccURL;
};

export class RemoveValidator extends BasePayload {
  private readonly _publicKey: Uint8Array;
  private readonly _owner?: AccURL;

  constructor(arg: RemoveValidatorArg) {
    super();
    this._publicKey = arg.publicKey;
    this._owner = arg.owner ? AccURL.toAccURL(arg.owner) : undefined;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.RemoveValidator, 1));
    forConcat.push(bytesMarshalBinary(this._publicKey, 2));

    if (this._owner) {
      forConcat.push(stringMarshalBinary(this._owner.toString(), 3));
    }

    return Buffer.concat(forConcat);
  }
}
