import { AccURL } from "../acc-url";
import { Signature } from "../lite-account";
import { SignatureInfo } from "./signature-info";

export type Signer = {
  publicKey: Uint8Array;
  nonce: number;
};

export type KeyPage = {
  height: number;
  index: number;
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
      nonce: si.nonce,
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
    checkOnly: txr.checkOnly ? txr.checkOnly : undefined,
    origin: txr.origin.toString(),
    sponsor: txr.origin.toString(),
    signer: {
      publicKey: Buffer.from(txr.signer.publicKey).toString("hex"),
      nonce: txr.signer.nonce,
    },
    signature: Buffer.from(txr.signature).toString("hex"),
    keyPage: {
      height: txr.keyPage.height,
      index: txr.keyPage.index,
    },
    payload: txr.payload,
  };
}
