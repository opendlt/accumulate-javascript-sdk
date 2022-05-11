import BN from "bn.js";
import { bigNumberMarshalBinary } from "..";
import { AccURL } from "../acc-url";
import { stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type CreateTokenArg = {
  url: string | AccURL;
  symbol: string;
  precision: number;
  properties?: string | AccURL;
  supplyLimit?: number | BN | string;
  authorities?: (string | AccURL)[];
};

export class CreateToken extends BasePayload {
  private readonly _url: AccURL;
  private readonly _symbol: string;
  private readonly _precision: number;
  private readonly _properties?: AccURL;
  private readonly _supplyLimit?: BN;
  private readonly _authorities: AccURL[];

  constructor(arg: CreateTokenArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._symbol = arg.symbol;
    this._precision = arg.precision;
    this._properties = arg.properties ? AccURL.toAccURL(arg.properties) : undefined;
    this._supplyLimit = arg.supplyLimit ? new BN(arg.supplyLimit) : undefined;
    this._authorities = arg?.authorities?.map((a) => AccURL.toAccURL(a)) || [];
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateToken, 1));
    forConcat.push(stringMarshalBinary(this._url.toString(), 2));

    if (this._symbol) {
      forConcat.push(stringMarshalBinary(this._symbol, 4));
    }
    if (this._precision) {
      forConcat.push(uvarintMarshalBinary(this._precision, 5));
    }
    if (this._properties) {
      forConcat.push(stringMarshalBinary(this._properties.toString(), 6));
    }
    if (this._supplyLimit) {
      forConcat.push(bigNumberMarshalBinary(this._supplyLimit, 7));
    }
    if (this._authorities.length > 0) {
      this._authorities.forEach((a) => forConcat.push(stringMarshalBinary(a.toString(), 9)));
    }

    return Buffer.concat(forConcat);
  }
}
