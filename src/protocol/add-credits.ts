import { u64 } from "../bigint";
import { AccURL } from "../acc-url";
import { TxType } from "../tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";
import { Payload } from "../payload";

export type AddCreditsArg = {
  recipient: string | AccURL;
  amount: number | u64;
};

export class AddCredits implements Payload {
  private readonly _recipient: AccURL;
  private readonly _amount: u64;
  private _binary?: Buffer;

  constructor(arg: AddCreditsArg) {
    this._recipient = arg.recipient instanceof AccURL ? arg.recipient : AccURL.parse(arg.recipient);
    this._amount = arg.amount instanceof u64 ? arg.amount : new u64(arg.amount);
  }

  marshalBinary(): Buffer {
    if (this._binary) {
      return this._binary;
    }

    this._binary = Buffer.concat([
      uvarintMarshalBinary(TxType.AddCredits),
      stringMarshalBinary(this._recipient.toString()),
      uvarintMarshalBinary(this._amount),
    ]);

    return this._binary;
  }
}
