import { AccURL } from "../acc-url";
import { u64 } from "../bigint";
import { Signature } from "../lite-account";
import { SignatureInfo } from "./signature-info";

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

export function getTxRequest(
  origin: AccURL,
  payload: any,
  signature: Signature,
  si: SignatureInfo
): TxRequest {
  return {
    checkOnly: false,
    payload,
    signer: {
      publicKey: signature.publicKey,
      nonce: signature.nonce,
    },
    origin,
    keyPage: {
      height: si.keyPageHeight,
      index: si.keyPageIndex,
    },
    signature: signature.signature,
  };
}

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
