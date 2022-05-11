import { AccURL } from "../acc-url";
import { booleanMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type CreateDataAccountArg = {
  url: string | AccURL;
  scratch?: boolean;
  authorities?: (string | AccURL)[];
};

export class CreateDataAccount extends BasePayload {
  private readonly _url: AccURL;
  private readonly _scratch: boolean;
  private readonly _authorities: AccURL[];

  constructor(arg: CreateDataAccountArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._scratch = arg.scratch || false;
    this._authorities = arg?.authorities?.map((a) => AccURL.toAccURL(a)) || [];
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateDataAccount, 1));
    forConcat.push(stringMarshalBinary(this._url.toString(), 2));

    if (this._scratch) {
      forConcat.push(booleanMarshalBinary(this._scratch, 5));
    }
    if (this._authorities.length > 0) {
      this._authorities.forEach((a) => forConcat.push(stringMarshalBinary(a.toString(), 6)));
    }

    return Buffer.concat(forConcat);
  }
}
