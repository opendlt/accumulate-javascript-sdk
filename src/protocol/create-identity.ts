import { AccURL } from "../acc-url";
import {
  uvarintMarshalBinary,
  stringMarshalBinary,
  bytesMarshalBinary,
} from "../encoding";
import { TxType } from "../tx-types";

export type CreateIdentity = {
  url: string | AccURL;
  publicKey: Uint8Array;
  keyBookName?: string;
  keyPageName?: string;
};

export function marshalBinaryCreateIdentity(ci: CreateIdentity): Buffer {
  return Buffer.concat([
    uvarintMarshalBinary(TxType.CreateIdentity),
    stringMarshalBinary(ci.url.toString()),
    bytesMarshalBinary(ci.publicKey),
    stringMarshalBinary(ci.keyBookName),
    stringMarshalBinary(ci.keyPageName),
  ]);
}
