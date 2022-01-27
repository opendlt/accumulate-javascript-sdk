import { AccURL } from "../acc-url";
import { TxType } from "./tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";
import { BasePayload } from "./base-payload";
import BN from "bn.js";
import { bigNumberMarshalBinary, booleanMarshalBinary } from "..";

export type CreateTokenArg = {
  url: string | AccURL;
  keyBookUrl?: string | AccURL;
  symbol: string;
  precision: number;
  properties?: string | AccURL;
  initialSupply?: number | BN | string;
  hasSupplyLimit?: boolean;
};

export class CreateToken extends BasePayload {
  private readonly _url: AccURL;
  private readonly _keyBookUrl?: AccURL;
  private readonly _symbol: string;
  private readonly _precision: number;
  private readonly _properties?: AccURL;
  private readonly _initialSupply?: BN;
  private readonly _hasSupplyLimit?: boolean;

  constructor(arg: CreateTokenArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._keyBookUrl = arg.keyBookUrl ? AccURL.toAccURL(arg.keyBookUrl) : undefined;
    this._symbol = arg.symbol;
    this._precision = arg.precision;
    this._properties = arg.properties ? AccURL.toAccURL(arg.properties) : undefined;
    this._initialSupply = arg.initialSupply ? new BN(arg.initialSupply) : undefined;
    this._hasSupplyLimit = arg.hasSupplyLimit;
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TxType.CreateToken),
      stringMarshalBinary(this._url.toString()),
      stringMarshalBinary(this._keyBookUrl?.toString()),
      stringMarshalBinary(this._symbol),
      uvarintMarshalBinary(this._precision),
      stringMarshalBinary(this._properties?.toString()),
      bigNumberMarshalBinary(this._initialSupply),
      booleanMarshalBinary(this._hasSupplyLimit),
    ]);
  }
}
