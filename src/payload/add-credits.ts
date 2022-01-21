import BN from "bn.js";
import { AccURL } from "../acc-url";
import { TxType } from "./tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";
import { BasePayload } from "./base-payload";

export type AddCreditsArg = {
  recipient: string | AccURL;
  amount: number | BN | string;
};

export class AddCredits extends BasePayload {
  private readonly _recipient: AccURL;
  private readonly _amount: BN;

  constructor(arg: AddCreditsArg) {
    super();
    this._recipient = AccURL.toAccURL(arg.recipient);
    this._amount = arg.amount instanceof BN ? arg.amount : new BN(arg.amount);
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TxType.AddCredits),
      stringMarshalBinary(this._recipient.toString()),
      uvarintMarshalBinary(this._amount),
    ]);
  }
}
