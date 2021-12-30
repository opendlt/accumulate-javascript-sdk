import { AccURL } from "../acc-url";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";
import { u64 } from "../bigint";

export type SignatureInfo = {
  url: AccURL;
  nonce: u64;
  keyPageHeight: u64;
  keyPageIndex: u64;
};

export function marshalSignatureInfo(si: SignatureInfo): Buffer {
  // console.log("~~~~~~~~~~~~~~~~~");
  // console.log(new Uint8Array(stringMarshalBinary(si.url.toString())));
  // console.log(new Uint8Array(uvarintMarshalBinary(si.nonce)));
  // console.log(new Uint8Array(uvarintMarshalBinary(si.keyPageHeight)));
  // console.log(new Uint8Array(uvarintMarshalBinary(si.keyPageIndex)));
  // console.log("~~~~~~~~~~~~~~~~~");
  return Buffer.concat([
    stringMarshalBinary(si.url.toString()),
    uvarintMarshalBinary(si.nonce),
    uvarintMarshalBinary(si.keyPageHeight),
    uvarintMarshalBinary(new u64(0)),
    uvarintMarshalBinary(si.keyPageIndex),
  ]);
}
