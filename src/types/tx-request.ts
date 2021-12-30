import { AccURL } from "../acc-url";
import { u64 } from "../bigint";
import { SignatureInfo, marshalSignatureInfo } from "./signature-info";
import { sha256 } from "../crypto";

export type Signer = {
  publicKey: Uint8Array;
  nonce: u64;
};

export type KeyPage = {
  height: u64;
  index: u64;
};

export type TxRequest = {
  checkOnly?: boolean;
  origin: AccURL;
  signer: Signer;
  signature: Uint8Array;
  keyPage: KeyPage;
  payload: any;
};

export function txRequestToParams(txr: TxRequest): any {
  return {
    checkOnly: txr.checkOnly || false,
    origin: txr.origin.toString(),
    sponsor: txr.origin.toString(),
    signer: {
      publicKey: Buffer.from(txr.signer.publicKey).toString("hex"),
      // TODO toNumber
      nonce: txr.signer.nonce.toNumber(),
    },
    signature: Buffer.from(txr.signature).toString("hex"),
    keyPage: {
      // TODO toNumber
      height: txr.keyPage.height.toNumber(),
      index: txr.keyPage.index.toNumber(),
    },
    payload: txr.payload,
  };
}

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
