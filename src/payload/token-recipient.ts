import BN from "bn.js";
import { AccURL } from "../acc-url";
import { bigNumberMarshalBinary, bytesMarshalBinary, stringMarshalBinary } from "../encoding";

export type TokenRecipientArg = {
  url: string | AccURL;
  amount: number | BN | string;
};

export type TokenRecipient = {
  url: AccURL;
  amount: BN;
};

export function marshalBinaryTokenRecipient(tr: TokenRecipient): Buffer {
  return bytesMarshalBinary(
    Buffer.concat([stringMarshalBinary(tr.url.toString(), 1), bigNumberMarshalBinary(tr.amount, 2)])
  );
}
