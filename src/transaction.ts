import { SignatureInfo, marshalSignatureInfo } from "./signature-info";
import { sha256 } from "./crypto";
import { uvarintMarshalBinary } from "./encoding";
import { Payload } from "./payload";
import { OriginSigner, Signature } from "./origin-signer";
import { AccURL } from "./acc-url";

export class Transaction {
  private readonly _sigInfo: SignatureInfo;
  private readonly _payloadBinary: Buffer;
  private _signature?: Signature;
  private _hash?: Buffer;

  constructor(payload: Payload, sigInfo: SignatureInfo, signature?: Signature) {
    this._payloadBinary = payload.marshalBinary();
    this._sigInfo = sigInfo;
    this._signature = signature;
  }

  hash(): Buffer {
    if (this._hash) {
      return this._hash;
    }
    const sHash = sha256(marshalSignatureInfo(this._sigInfo));
    const tHash = sha256(this._payloadBinary);
    this._hash = sha256(Buffer.concat([sHash, tHash]));
    return this._hash;
  }

  dataForSigning() {
    return Buffer.concat([uvarintMarshalBinary(this._sigInfo.nonce), this.hash()]);
  }

  get payload(): Uint8Array {
    return this._payloadBinary;
  }

  get origin(): AccURL {
    return this._sigInfo.origin;
  }

  get signatureInfo(): SignatureInfo {
    return this._sigInfo;
  }

  get signature(): Signature | undefined {
    return this._signature;
  }

  set signature(signature: Signature | undefined) {
    this._signature = signature;
  }

  sign(signer: OriginSigner): void {
    this._signature = signer.sign(this);
  }

  toTxRequest(checkOnly?: boolean): TxRequest {
    if (this._signature === undefined) {
      throw new Error("Unsigned transaction cannot be converted to TxRequest");
    }

    return {
      checkOnly: checkOnly ? checkOnly : undefined,
      origin: this.origin.toString(),
      signer: {
        publicKey: Buffer.from(this._signature!.publicKey).toString("hex"),
        nonce: this._sigInfo.nonce,
      },
      signature: Buffer.from(this._signature!.signature).toString("hex"),
      keyPage: {
        height: this._sigInfo.keyPageHeight,
        index: this._sigInfo.keyPageIndex,
      },
      payload: this._payloadBinary.toString("hex"),
    };
  }
}

export type TxRequest = {
  checkOnly?: boolean;
  origin: string;
  signer: {
    publicKey: string;
    nonce: number;
  };
  signature: string;
  keyPage: {
    height: number;
    index: number;
  };
  payload: string;
};
