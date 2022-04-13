import { AccURL } from "./acc-url";

export enum SignatureType {
  SignatureTypeED25519 = 2,
  SignatureTypeRCD1 = 3,
}

export function signatureTypeMarshalJSON(sigType: SignatureType) {
  switch (sigType) {
    case SignatureType.SignatureTypeED25519:
      return "ed25519";
    case SignatureType.SignatureTypeRCD1:
      return "rcd1";
    default:
      throw new Error("Cannot marshal JSON SignatureType: " + sigType);
  }
}

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
