import BN from "bn.js";
import { TxType } from "./tx-types";
import { uvarintMarshalBinary, bigNumberMarshalBinary } from "../encoding";
import { BasePayload } from "./base-payload";

export type BurnTokensArg = {
  amount: number | BN | string;
};

export class BurnTokens extends BasePayload {
  private readonly _amount: BN;

  constructor(arg: BurnTokensArg) {
    super();
    this._amount = arg.amount instanceof BN ? arg.amount : new BN(arg.amount);
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TxType.BurnTokens),
      bigNumberMarshalBinary(this._amount),
    ]);
  }
}
