import BN from "bn.js";
import { AccURL } from "../acc-url";
import { bigNumberMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type AddCreditsArg = {
  recipient: string | AccURL;
  amount: number | BN | string;
  oracle: number | BN | string;
};

export class AddCredits extends BasePayload {
  private readonly _recipient: AccURL;
  private readonly _amount: BN;
  private readonly _oracle: BN;

  constructor(arg: AddCreditsArg) {
    super();
    this._recipient = AccURL.toAccURL(arg.recipient);
    this._amount = arg.amount instanceof BN ? arg.amount : new BN(arg.amount);
    this._oracle = arg.oracle instanceof BN ? arg.oracle : new BN(arg.oracle);
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.AddCredits, 1));
    forConcat.push(stringMarshalBinary(this._recipient.toString(), 2));
    forConcat.push(bigNumberMarshalBinary(this._amount, 3));

    if (this._oracle) {
      forConcat.push(uvarintMarshalBinary(this._oracle, 4));
    }

    return Buffer.concat(forConcat);
  }
}
