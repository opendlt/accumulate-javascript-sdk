import BN from "bn.js";
import { AccURL } from "../acc-url";
import { bigNumberMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export type IssueTokensArg = {
  recipient: string | AccURL;
  amount: number | BN | string;
};

export class IssueTokens extends BasePayload {
  private readonly _recipient: AccURL;
  private readonly _amount: BN;

  constructor(arg: IssueTokensArg) {
    super();
    this._recipient = AccURL.toAccURL(arg.recipient);
    this._amount = arg.amount instanceof BN ? arg.amount : new BN(arg.amount);
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TransactionType.IssueTokens),
      stringMarshalBinary(this._recipient.toString()),
      bigNumberMarshalBinary(this._amount),
    ]);
  }
}
