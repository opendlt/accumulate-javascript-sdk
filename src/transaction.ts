import { TransactionBody } from "../new/core";
import { hashBody } from "../new/core/base";
import { encode } from "../new/encoding";
import { AccURL } from "./acc-url";
import { sha256 } from "./crypto";
import {
  bytesMarshalBinary,
  hashMarshalBinary,
  stringMarshalBinary,
  uvarintMarshalBinary,
} from "./encoding";
import { Signature, signatureTypeMarshalJSON, SignerInfo } from "./signer";
import { TxSigner } from "./tx-signer";

export type HeaderOptions = {
  timestamp?: number;
  memo?: string;
  metadata?: Uint8Array;
  initiator?: Uint8Array;
};

/**
 * Transaction header
 */
export class Header {
  private readonly _principal: AccURL;
  private _initiator?: Buffer;
  private readonly _memo?: string;
  private readonly _metadata?: Buffer;

  // Timestamp is not part of Header from a protocol point of view (not marshalled)
  private readonly _timestamp: number;

  /**
   * Construct a Transaction Header
   * @param principal principal of the transaction
   * @param options options.
   * - If timestamp is not specified it defaults to the current timestamp in microseconds.
   */
  constructor(principal: string | AccURL, options?: HeaderOptions) {
    this._principal = AccURL.toAccURL(principal);
    this._timestamp = options?.timestamp ?? Date.now();
    this._initiator = options?.initiator && Buffer.from(options.initiator);
    this._memo = options?.memo;
    this._metadata = options?.metadata ? Buffer.from(options.metadata) : undefined;
  }

  get principal(): AccURL {
    return this._principal;
  }

  get timestamp(): number {
    return this._timestamp;
  }

  get memo(): string | undefined {
    return this._memo;
  }

  get metadata(): Buffer | undefined {
    return this._metadata;
  }

  computeInitiator(signerInfo: SignerInfo): Buffer {
    const binary = [];
    binary.push(uvarintMarshalBinary(signerInfo.type, 1));
    binary.push(bytesMarshalBinary(signerInfo.publicKey, 2));
    binary.push(stringMarshalBinary(signerInfo.url.toString(), 4));
    binary.push(uvarintMarshalBinary(signerInfo.version, 5));
    binary.push(uvarintMarshalBinary(this._timestamp, 6));

    this._initiator = sha256(Buffer.concat(binary));

    return this._initiator;
  }

  marshalBinary(): Buffer {
    if (!this._initiator) {
      throw new Error("Initiator hash missing. Must be initilized by calling computeInitiator");
    }

    const forConcat = [];

    forConcat.push(stringMarshalBinary(this._principal.toString(), 1));
    forConcat.push(hashMarshalBinary(this._initiator, 2));

    if (this._memo && this._memo.length !== 0) {
      forConcat.push(stringMarshalBinary(this._memo, 3));
    }
    if (this._metadata && this._metadata?.length !== 0) {
      forConcat.push(bytesMarshalBinary(this._metadata, 4));
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
  private _bodyHash: Buffer;

  constructor(payload: TransactionBody, header: Header, signature?: Signature) {
    this._payloadBinary = encode(payload);
    this._header = header;
    this._signature = signature;
    this._bodyHash = hashBody(payload);
  }

  /**
   * Compute the hash of the transaction
   */
  hash(): Buffer {
    if (this._hash) {
      return this._hash;
    }

    const headerHash = sha256(this._header.marshalBinary());
    this._hash = sha256(Buffer.concat([headerHash, this._bodyHash]));

    return this._hash;
  }

  /**
   * Data that needs to be signed in order to submit the transaction.
   */
  dataForSignature(signerInfo: SignerInfo): Buffer {
    const sigHash = this.header.computeInitiator(signerInfo);
    return sha256(Buffer.concat([sigHash, this.hash()]));
  }

  get payload(): Uint8Array {
    return this._payloadBinary;
  }

  get principal(): AccURL {
    return this._header.principal;
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

  async sign(signer: TxSigner): Promise<void> {
    this._signature = await signer.sign(this);
  }

  /**
   * Convert the Transaction into the param object for the `execute` API method
   */
  toTxRequest(checkOnly?: boolean): TxRequest {
    if (!this._signature) {
      throw new Error("Unsigned transaction cannot be converted to TxRequest");
    }

    const signerInfo = this._signature.signerInfo;

    return {
      checkOnly: checkOnly ? checkOnly : undefined,
      isEnvelope: false,
      origin: this._header.principal.toString(),
      signer: {
        url: signerInfo.url.toString(),
        publicKey: Buffer.from(signerInfo.publicKey).toString("hex"),
        version: signerInfo.version,
        timestamp: this._header.timestamp,
        signatureType: signatureTypeMarshalJSON(signerInfo.type),
        useSimpleHash: true,
      },
      signature: Buffer.from(this._signature.signature).toString("hex"),
      txHash: this._hash?.toString("hex"),
      payload: this._payloadBinary.toString("hex"),
      memo: this._header.memo,
      metadata: this._header.metadata?.toString("hex"),
    };
  }
}

export type TxRequest = {
  checkOnly?: boolean;
  isEnvelope?: boolean;
  origin: string;
  signer: {
    publicKey: string;
    timestamp: number;
    url: string;
    version?: number;
    signatureType?: string;
    useSimpleHash?: boolean;
  };
  signature: string;
  txHash?: string;
  payload: string;
  memo?: string;
  metadata?: string;
};
