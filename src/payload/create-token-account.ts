import { AccURL } from "../acc-url";
import { booleanMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
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
    return Buffer.concat([
      uvarintMarshalBinary(TransactionType.CreateTokenAccount),
      stringMarshalBinary(this._url.toString()),
      stringMarshalBinary(this._tokenUrl.toString()),
      stringMarshalBinary(this._keyBookUrl?.toString()),
      booleanMarshalBinary(this._scratch),
      stringMarshalBinary(this._manager?.toString()),
    ]);
  }
}
