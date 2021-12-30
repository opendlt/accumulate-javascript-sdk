import { SignatureInfo, marshalSignatureInfo } from "./signature-info";
import { sha256 } from "../crypto";
import { uvarintMarshalBinary } from "../encoding";

export function transactionHash(
  payload: Uint8Array,
  si: SignatureInfo
): Buffer {
  const sHash = sha256(marshalSignatureInfo(si));
  const tHash = sha256(payload);
  return sha256(Buffer.concat([sHash, tHash]));
}

export function txDataToSign(payload: Uint8Array, si: SignatureInfo): Buffer {
  return Buffer.concat([
    uvarintMarshalBinary(si.nonce),
    transactionHash(payload, si),
  ]);
}
