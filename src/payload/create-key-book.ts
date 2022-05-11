import { AccURL } from "../acc-url";
import { bytesMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type CreateKeyBookArg = {
  url: string | AccURL;
  publicKeyHash: Uint8Array;
  authorities?: (string | AccURL)[];
};

export class CreateKeyBook extends BasePayload {
  private readonly _url: AccURL;
  private readonly _publicKeyHash: Uint8Array;
  private readonly _authorities: AccURL[];

  constructor(arg: CreateKeyBookArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._publicKeyHash = arg.publicKeyHash;
    this._authorities = arg?.authorities?.map((a) => AccURL.toAccURL(a)) || [];
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateKeyBook, 1));
    forConcat.push(stringMarshalBinary(this._url.toString(), 2));
    forConcat.push(bytesMarshalBinary(this._publicKeyHash, 3));
    if (this._authorities.length > 0) {
      this._authorities.forEach((a) => forConcat.push(stringMarshalBinary(a.toString(), 5)));
    }

    return Buffer.concat(forConcat);
  }
}
