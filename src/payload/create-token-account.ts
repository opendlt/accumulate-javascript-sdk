import { AccURL } from "../acc-url";
import { booleanMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type CreateTokenAccountArg = {
  url: string | AccURL;
  tokenUrl: string | AccURL;
  scratch?: boolean;
  authorities?: (string | AccURL)[];
};

export class CreateTokenAccount extends BasePayload {
  private readonly _url: AccURL;
  private readonly _tokenUrl: AccURL;
  private readonly _scratch: boolean;
  private readonly _authorities: AccURL[];

  constructor(arg: CreateTokenAccountArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._tokenUrl = AccURL.toAccURL(arg.tokenUrl);
    this._scratch = arg.scratch || false;
    this._authorities = arg?.authorities?.map((a) => AccURL.toAccURL(a)) || [];
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateTokenAccount, 1));
    forConcat.push(stringMarshalBinary(this._url.toString(), 2));
    forConcat.push(stringMarshalBinary(this._tokenUrl.toString(), 3));

    if (this._scratch) {
      forConcat.push(booleanMarshalBinary(this._scratch, 5));
    }
    if (this._authorities.length > 0) {
      this._authorities.forEach((a) => forConcat.push(stringMarshalBinary(a.toString(), 7)));
    }

    return Buffer.concat(forConcat);
  }
}
