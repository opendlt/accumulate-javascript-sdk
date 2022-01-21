import { AccURL } from "../acc-url";
import { TxType } from "./tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";
import { BasePayload } from "./base-payload";

export type CreateTokenArg = {
  url: string | AccURL;
  symbol: string;
  precision: number;
  properties?: string | AccURL;
};

export class CreateToken extends BasePayload {
  private readonly _url: AccURL;
  private readonly _symbol: string;
  private readonly _precision: number;
  private readonly _properties?: AccURL;

  constructor(arg: CreateTokenArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._symbol = arg.symbol;
    this._precision = arg.precision;
    this._properties = arg.properties ? AccURL.toAccURL(arg.properties) : undefined;
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TxType.CreateToken),
      stringMarshalBinary(this._url.toString()),
      stringMarshalBinary(this._symbol),
      uvarintMarshalBinary(this._precision),
      stringMarshalBinary(this._properties?.toString()),
    ]);
  }
}
