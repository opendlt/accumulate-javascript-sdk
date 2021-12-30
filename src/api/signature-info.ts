import { AccURL } from "../acc-url";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";

export type SignatureInfo = {
  url: AccURL;
  nonce: number;
  keyPageHeight: number;
  keyPageIndex: number;
};

export function marshalSignatureInfo(si: SignatureInfo): Buffer {
  return Buffer.concat([
    stringMarshalBinary(si.url.toString()),
    uvarintMarshalBinary(si.nonce),
    uvarintMarshalBinary(si.keyPageHeight),
    uvarintMarshalBinary(0),
    uvarintMarshalBinary(si.keyPageIndex),
  ]);
}
