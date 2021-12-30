import { u64 } from "../bigint";
import { AccURL } from "../acc-url";
import { TxType } from "../tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";

export type AddCredits = {
  recipient: string | AccURL;
  amount: number | u64;
};

export function marshalBinaryAddCredits(ac: AddCredits): Buffer {
  return Buffer.concat([
    uvarintMarshalBinary(TxType.AddCredits),
    stringMarshalBinary(ac.recipient.toString()),
    uvarintMarshalBinary(ac.amount),
  ]);
}
