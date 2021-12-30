
import { SignatureInfo, marshalSignatureInfo } from "./signature-info";
import { sha256 } from "../crypto";

export function transactionHash(
    payload: Uint8Array,
    si: SignatureInfo
  ): Buffer {
    // console.log("transactionHash")
    // console.log(new Uint8Array(marshalSignatureInfo(si)));
    const sHash = sha256(marshalSignatureInfo(si));
    // console.log("sHash", new Uint8Array(sHash));
    const tHash = sha256(payload);
    // console.log("tHash", new Uint8Array(tHash));
    return sha256(Buffer.concat([sHash, tHash]));
  }