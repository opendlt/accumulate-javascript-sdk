import { TxType } from "../tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";
import { AccURL } from "../acc-url";
import { BasePayload } from "./base-payload";

export type CreateTokenAccountArg = {
  url: string | AccURL;
  tokenUrl: string | AccURL;
  keyBookUrl: string | AccURL;
};

export class CreateTokenAccount extends BasePayload {
  private readonly _url: AccURL;
  private readonly _tokenUrl: AccURL;
  private readonly _keyBookUrl: AccURL;

  constructor(arg: CreateTokenAccountArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._tokenUrl = AccURL.toAccURL(arg.tokenUrl);
    this._keyBookUrl = AccURL.toAccURL(arg.keyBookUrl);
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TxType.CreateTokenAccount),
      stringMarshalBinary(this._url.toString()),
      stringMarshalBinary(this._tokenUrl.toString()),
      stringMarshalBinary(this._keyBookUrl.toString()),
    ]);
  }
}
