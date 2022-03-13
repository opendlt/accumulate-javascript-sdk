import BN from "bn.js";
import { bigNumberMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
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
      uvarintMarshalBinary(TransactionType.BurnTokens, 1),
      bigNumberMarshalBinary(this._amount, 2),
    ]);
  }
}
