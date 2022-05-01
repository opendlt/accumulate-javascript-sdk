import { bytesMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type UpdateValidatorKeyArg = {
  publicKey: Uint8Array;
  newPublicKey: Uint8Array;
};

export class UpdateValidatorKey extends BasePayload {
  private readonly _publicKey: Uint8Array;
  private readonly _newPublicKey: Uint8Array;

  constructor(arg: UpdateValidatorKeyArg) {
    super();
    this._publicKey = arg.publicKey;
    this._newPublicKey = arg.newPublicKey;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.UpdateValidatorKey, 1));
    forConcat.push(bytesMarshalBinary(this._publicKey, 2));
    forConcat.push(bytesMarshalBinary(this._newPublicKey, 3));

    return Buffer.concat(forConcat);
  }
}
