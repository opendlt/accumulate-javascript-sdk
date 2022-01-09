import { AccURL } from "./acc-url";
import { uvarintMarshalBinary, stringMarshalBinary } from "./encoding";

export type SignatureInfo = {
  origin: AccURL;
  nonce: number;
  keyPageHeight: number;
  keyPageIndex: number;
};

export function marshalSignatureInfo(si: SignatureInfo): Buffer {
  return Buffer.concat([
    stringMarshalBinary(si.origin.toString()),
    uvarintMarshalBinary(si.keyPageHeight),
    uvarintMarshalBinary(si.keyPageIndex),
    uvarintMarshalBinary(si.nonce),
  ]);
}
