import { AccURL } from "./acc-url";
import { sha256 } from "./crypto";
import {
  bytesMarshalBinary,
  marshalField,
  stringMarshalBinary,
  uvarintMarshalBinary,
} from "./encoding";
import { OriginSigner, Signature } from "./origin-signer";
import { Payload } from "./payload";

export type HeaderOptions = {
  nonce?: number;
  keyPageHeight?: number;
  keyPageIndex?: number;
  memo?: string;
  metadata?: Uint8Array;
};

/**
 * Transaction header
 */
export class Header {
  private readonly _origin: AccURL;
  private readonly _nonce: number;
  private readonly _keyPageHeight: number;
  private readonly _keyPageIndex: number;
  private readonly _memo?: string;
  private readonly _metadata?: Uint8Array;

  /**
   * Construct a Transaction Header
   * @param origin origin of the transaction
   * @param options options.
   * - If nonce is not specified it defaults to the current timestamp in microseconds.
   * - If keyPageHeight is not specified, it defaults to 1.
   * - If keyPageIndex is not specified, it defaults to 0.
   */
  constructor(origin: string | AccURL, options?: HeaderOptions) {
    this._origin = AccURL.toAccURL(origin);
    this._nonce = options?.nonce ?? Date.now() * 1000;
    this._keyPageHeight = options?.keyPageHeight ?? 1;
    this._keyPageIndex = options?.keyPageIndex ?? 0;
    this._memo = options?.memo;
    this._metadata = options?.metadata;
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

  get memo(): string | undefined {
    return this._memo;
  }

  get metadata(): Uint8Array | undefined {
    return this._metadata;
  }

  marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(marshalField(1, stringMarshalBinary(this._origin.toString())));

    if (this._keyPageHeight !== 0) {
      forConcat.push(marshalField(2, uvarintMarshalBinary(this._keyPageHeight)));
    }
    if (this._keyPageIndex !== 0) {
      forConcat.push(marshalField(3, uvarintMarshalBinary(this._keyPageIndex)));
    }
    if (this._nonce !== 0) {
      forConcat.push(marshalField(4, uvarintMarshalBinary(this._nonce)));
    }
    if (this._memo && this._memo.length !== 0) {
      forConcat.push(marshalField(5, stringMarshalBinary(this._memo)));
    }
    if (this._metadata && this._metadata?.length !== 0) {
      forConcat.push(marshalField(6, bytesMarshalBinary(this._metadata)));
    }

    return Buffer.concat(forConcat);
  }
}

/**
 * An Accumulate Transaction
 */
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

  /**
   * Compute the hash of the transaction
   */
  hash(): Buffer {
    if (this._hash) {
      return this._hash;
    }
    const sHash = sha256(this._header.marshalBinary());
    const tHash = sha256(this._payloadBinary);
    this._hash = sha256(Buffer.concat([sHash, tHash]));
    return this._hash;
  }

  /**
   * Data that needs to be signed in order to submit the transaction.
   */
  dataForSignature(): Buffer {
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

  async sign(signer: OriginSigner): Promise<void> {
    this._signature = await signer.sign(this);
  }

  /**
   * Convert the Transaction into the param object for the `execute` API method
   */
  toTxRequest(checkOnly?: boolean): TxRequest {
    if (!this._signature) {
      throw new Error("Unsigned transaction cannot be converted to TxRequest");
    }

    return {
      checkOnly: checkOnly ? checkOnly : undefined,
      origin: this.origin.toString(),
      signer: {
        publicKey: Buffer.from(this._signature.publicKey).toString("hex"),
        nonce: this._header.nonce,
      },
      signature: Buffer.from(this._signature.signature).toString("hex"),
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
