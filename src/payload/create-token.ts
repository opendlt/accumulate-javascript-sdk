import BN from "bn.js";
import { bigNumberMarshalBinary, booleanMarshalBinary } from "..";
import { AccURL } from "../acc-url";
import { stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export type CreateTokenArg = {
  url: string | AccURL;
  keyBookUrl?: string | AccURL;
  symbol: string;
  precision: number;
  properties?: string | AccURL;
  initialSupply?: number | BN | string;
  hasSupplyLimit?: boolean;
  manager?: string | AccURL;
};

export class CreateToken extends BasePayload {
  private readonly _url: AccURL;
  private readonly _keyBookUrl?: AccURL;
  private readonly _symbol: string;
  private readonly _precision: number;
  private readonly _properties?: AccURL;
  private readonly _initialSupply?: BN;
  private readonly _hasSupplyLimit?: boolean;
  private readonly _manager?: AccURL;

  constructor(arg: CreateTokenArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._keyBookUrl = arg.keyBookUrl ? AccURL.toAccURL(arg.keyBookUrl) : undefined;
    this._symbol = arg.symbol;
    this._precision = arg.precision;
    this._properties = arg.properties ? AccURL.toAccURL(arg.properties) : undefined;
    this._initialSupply = arg.initialSupply ? new BN(arg.initialSupply) : undefined;
    this._hasSupplyLimit = arg.hasSupplyLimit;
    this._manager = arg.manager ? AccURL.toAccURL(arg.manager) : undefined;
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TransactionType.CreateToken),
      stringMarshalBinary(this._url.toString()),
      stringMarshalBinary(this._keyBookUrl?.toString()),
      stringMarshalBinary(this._symbol),
      uvarintMarshalBinary(this._precision),
      stringMarshalBinary(this._properties?.toString()),
      bigNumberMarshalBinary(this._initialSupply),
      booleanMarshalBinary(this._hasSupplyLimit),
      stringMarshalBinary(this._manager?.toString()),
    ]);
  }
}
