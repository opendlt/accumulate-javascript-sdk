import { AccURL } from "../acc-url";
import { booleanMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type CreateTokenAccountArg = {
  url: string | AccURL;
  tokenUrl: string | AccURL;
  keyBookUrl?: string | AccURL;
  scratch?: boolean;
  manager?: string | AccURL;
};

export class CreateTokenAccount extends BasePayload {
  private readonly _url: AccURL;
  private readonly _tokenUrl: AccURL;
  private readonly _keyBookUrl?: AccURL;
  private readonly _scratch: boolean;
  private readonly _manager?: AccURL;

  constructor(arg: CreateTokenAccountArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._tokenUrl = AccURL.toAccURL(arg.tokenUrl);
    this._keyBookUrl = arg.keyBookUrl ? AccURL.toAccURL(arg.keyBookUrl) : undefined;
    this._scratch = arg.scratch || false;
    this._manager = arg.manager ? AccURL.toAccURL(arg.manager) : undefined;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateTokenAccount, 1));
    forConcat.push(stringMarshalBinary(this._url.toString(), 2));
    forConcat.push(stringMarshalBinary(this._tokenUrl.toString(), 3));

    if (this._keyBookUrl) {
      forConcat.push(stringMarshalBinary(this._keyBookUrl.toString(), 4));
    }
    if (this._scratch) {
      forConcat.push(booleanMarshalBinary(this._scratch, 5));
    }
    if (this._manager) {
      forConcat.push(stringMarshalBinary(this._manager.toString(), 6));
    }

    return Buffer.concat(forConcat);
  }
}
