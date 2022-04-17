import BN from "bn.js";
import { bigNumberMarshalBinary, booleanMarshalBinary } from "..";
import { AccURL } from "../acc-url";
import { stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
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
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateToken, 1));
    forConcat.push(stringMarshalBinary(this._url.toString(), 2));
    if (this._keyBookUrl) {
      forConcat.push(stringMarshalBinary(this._keyBookUrl.toString(), 3));
    }
    if (this._symbol) {
      forConcat.push(stringMarshalBinary(this._symbol, 4));
    }
    if (this._precision) {
      forConcat.push(uvarintMarshalBinary(this._precision, 5));
    }
    if (this._properties) {
      forConcat.push(stringMarshalBinary(this._properties.toString(), 6));
    }
    if (this._initialSupply) {
      forConcat.push(bigNumberMarshalBinary(this._initialSupply, 7));
    }
    if (this._hasSupplyLimit) {
      forConcat.push(booleanMarshalBinary(this._hasSupplyLimit, 8));
    }
    if (this._manager) {
      forConcat.push(stringMarshalBinary(this._manager.toString(), 9));
    }

    return Buffer.concat(forConcat);
  }
}
