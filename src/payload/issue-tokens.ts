import BN from "bn.js";
import { AccURL } from "../acc-url";
import { fieldMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";
import { marshalBinaryTokenRecipient, TokenRecipient, TokenRecipientArg } from "./token-recipient";

export type IssueTokensArg = {
  to: TokenRecipientArg[];
};

export class IssueTokens extends BasePayload {
  private readonly _to: TokenRecipient[];

  constructor(arg: IssueTokensArg) {
    super();
    if (arg.to.length < 1) {
      throw new Error("Missing at least one recipient");
    }

    this._to = arg.to.map((r) => ({
      url: AccURL.toAccURL(r.url),
      amount: r.amount instanceof BN ? r.amount : new BN(r.amount),
    }));
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.IssueTokens, 1));

    this._to.forEach((recipient) =>
      forConcat.push(fieldMarshalBinary(4, marshalBinaryTokenRecipient(recipient)))
    );

    return Buffer.concat(forConcat);
  }
}
