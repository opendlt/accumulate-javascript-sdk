import { TxType } from "../tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";
import { Payload } from "../payload";
import { AccURL } from "../acc-url";

export type CreateTokenAccountArg = {
  url: string | AccURL;
  tokenUrl: string | AccURL;
  keyBookUrl: string | AccURL;
};

export class CreateTokenAccount implements Payload {
  private readonly _url: AccURL;
  private readonly _tokenUrl: AccURL;
  private readonly _keyBookUrl: AccURL;
  private _binary?: Buffer;

  constructor(arg: CreateTokenAccountArg) {
    this._url = arg.url instanceof AccURL ? arg.url : AccURL.parse(arg.url);
    this._tokenUrl = arg.tokenUrl instanceof AccURL ? arg.tokenUrl : AccURL.parse(arg.tokenUrl);
    this._keyBookUrl =
      arg.keyBookUrl instanceof AccURL ? arg.keyBookUrl : AccURL.parse(arg.keyBookUrl);
  }

  marshalBinary(): Buffer {
    if (this._binary) {
      return this._binary;
    }

    this._binary = Buffer.concat([
      uvarintMarshalBinary(TxType.CreateTokenAccount),
      stringMarshalBinary(this._url.toString()),
      stringMarshalBinary(this._tokenUrl.toString()),
      stringMarshalBinary(this._keyBookUrl.toString()),
    ]);

    return this._binary;
  }
}
