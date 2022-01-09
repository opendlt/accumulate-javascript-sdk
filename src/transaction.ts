import { sha256 } from "./crypto";
import { stringMarshalBinary, uvarintMarshalBinary } from "./encoding";
import { Payload } from "./payload";
import { OriginSigner, Signature } from "./origin-signer";
import { AccURL } from "./acc-url";

type HeaderOptions = {
  nonce?: number;
  keyPageHeight?: number;
  keyPageIndex?: number;
};

export class Header {
  private readonly _origin: AccURL;
  private readonly _nonce: number;
  private readonly _keyPageHeight: number;
  private readonly _keyPageIndex: number;

  constructor(origin: string | AccURL, opts?: HeaderOptions) {
    this._origin = AccURL.toAccURL(origin);
    this._nonce = opts?.nonce ?? Date.now();
    this._keyPageHeight = opts?.keyPageHeight ?? 1;
    this._keyPageIndex = opts?.keyPageHeight ?? 0;
  }

  get origin(): AccURL {
    return this._origin;
  }

  get nonce(): number {
    return this._nonce;
  }

  get keyPageHeight(): number {
    return this._keyPageHeight;
  }

  get keyPageIndex(): number {
    return this._keyPageIndex;
  }

  marshalBinary(): Buffer {
    return Buffer.concat([
      stringMarshalBinary(this._origin.toString()),
      uvarintMarshalBinary(this._keyPageHeight),
      uvarintMarshalBinary(this._keyPageIndex),
      uvarintMarshalBinary(this._nonce),
    ]);
  }
}

export class Transaction {
  private readonly _header: Header;
  private readonly _payloadBinary: Buffer;
  private _signature?: Signature;
  private _hash?: Buffer;

  constructor(payload: Payload, header: Header, signature?: Signature) {
    this._payloadBinary = payload.marshalBinary();
    this._header = header;
    this._signature = signature;
  }

  hash(): Buffer {
    if (this._hash) {
      return this._hash;
    }
    const sHash = sha256(this._header.marshalBinary());
    const tHash = sha256(this._payloadBinary);
    this._hash = sha256(Buffer.concat([sHash, tHash]));
    return this._hash;
  }

  dataForSigning() {
    return Buffer.concat([uvarintMarshalBinary(this._header.nonce), this.hash()]);
  }

  get payload(): Uint8Array {
    return this._payloadBinary;
  }

  get origin(): AccURL {
    return this._header.origin;
  }

  get header(): Header {
    return this._header;
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
        nonce: this._header.nonce,
      },
      signature: Buffer.from(this._signature!.signature).toString("hex"),
      keyPage: {
        height: this._header.keyPageHeight,
        index: this._header.keyPageIndex,
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
