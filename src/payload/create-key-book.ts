import { AccURL } from "../acc-url";
import { bytesMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export type CreateKeyBookArg = {
  url: string | AccURL;
  publicKeyHash: Uint8Array;
  manager?: string | AccURL;
};

export class CreateKeyBook extends BasePayload {
  private readonly _url: AccURL;
  private readonly _publicKeyHash: Uint8Array;
  private readonly _manager?: AccURL;

  constructor(arg: CreateKeyBookArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._publicKeyHash = arg.publicKeyHash;
    this._manager = arg.manager ? AccURL.toAccURL(arg.manager) : undefined;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateKeyBook, 1));
    forConcat.push(stringMarshalBinary(this._url.toString(), 2));
    forConcat.push(bytesMarshalBinary(this._publicKeyHash, 3));
    if (this._manager) {
      forConcat.push(stringMarshalBinary(this._manager.toString(), 4));
    }

    return Buffer.concat(forConcat);
  }
}
