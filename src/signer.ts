import { SignatureType } from "../new/core";
import { AccURL } from "./acc-url";

export interface Signer {
  signRaw(data: Uint8Array): Promise<Uint8Array>;
  get publicKey(): Uint8Array;
  get publicKeyHash(): Uint8Array;
  get type(): SignatureType;
}

export type SignerInfo = {
  type: SignatureType;
  url: AccURL;
  publicKey: Uint8Array;
  version: number;
};

export type Signature = {
  signerInfo: SignerInfo;
  signature: Uint8Array;
};
