import { u64 } from "../bigint";
import { AccURL } from "../acc-url";
import { TxType } from "./tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";
import { BasePayload } from "./base-payload";

export type AddCreditsArg = {
  recipient: string | AccURL;
  amount: number | u64;
};

export class AddCredits extends BasePayload {
  private readonly _recipient: AccURL;
  private readonly _amount: u64;

  constructor(arg: AddCreditsArg) {
    super();
    this._recipient = AccURL.toAccURL(arg.recipient);
    this._amount = arg.amount instanceof u64 ? arg.amount : new u64(arg.amount);
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TxType.AddCredits),
      stringMarshalBinary(this._recipient.toString()),
      uvarintMarshalBinary(this._amount),
    ]);
  }
}
