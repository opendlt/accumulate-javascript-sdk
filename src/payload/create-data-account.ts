import { TxType } from "../tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";
import { AccURL } from "../acc-url";
import { BasePayload } from "./base-payload";

export type CreateDataAccountArg = {
  url: string | AccURL;
  keyBookUrl?: string | AccURL;
  managerKeyBookUrl?: string | AccURL;
};

export class CreateDataAccount extends BasePayload {
  private readonly _url: AccURL;
  private readonly _keyBookUrl?: AccURL;
  private readonly _managerKeyBookUrl?: AccURL;

  constructor(arg: CreateDataAccountArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._keyBookUrl = arg.keyBookUrl ? AccURL.toAccURL(arg.keyBookUrl) : undefined;
    this._managerKeyBookUrl = arg.managerKeyBookUrl ? AccURL.toAccURL(arg.managerKeyBookUrl) : undefined;
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TxType.CreateTokenAccount),
      stringMarshalBinary(this._url.toString()),
      stringMarshalBinary(this._keyBookUrl?.toString()),
      stringMarshalBinary(this._managerKeyBookUrl?.toString()),
    ]);
  }
}
