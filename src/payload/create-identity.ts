import { AccURL } from "../acc-url";
import { bytesMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type CreateIdentityArg = {
  url: string | AccURL;
  keyHash?: Uint8Array;
  keyBookUrl?: string | AccURL;
  authorities?: (string | AccURL)[];
};

export class CreateIdentity extends BasePayload {
  private readonly _url: AccURL;
  private readonly _keyHash?: Uint8Array;
  private readonly _keyBookUrl?: AccURL;
  private readonly _authorities: AccURL[];

  constructor(arg: CreateIdentityArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._keyHash = arg.keyHash;
    this._keyBookUrl = arg.keyBookUrl ? AccURL.toAccURL(arg.keyBookUrl) : undefined;
    this._authorities = arg?.authorities?.map((a) => AccURL.toAccURL(a)) || [];
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateIdentity, 1));
    forConcat.push(stringMarshalBinary(this._url.toString(), 2));
    if (this._keyHash) {
      forConcat.push(bytesMarshalBinary(this._keyHash, 3));
    }
    if (this._keyBookUrl) {
      forConcat.push(stringMarshalBinary(this._keyBookUrl.toString(), 4));
    }
    if (this._authorities.length > 0) {
      this._authorities.forEach((a) => forConcat.push(stringMarshalBinary(a.toString(), 6)));
    }

    return Buffer.concat(forConcat);
  }
}
