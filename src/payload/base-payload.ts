import { sha256 } from "../crypto";
import { Payload } from "../payload";

export abstract class BasePayload implements Payload {
  private _binary?: Buffer;
  private _payloadHash?: Buffer;

  marshalBinary(): Buffer {
    if (this._binary) {
      return this._binary;
    }

    this._binary = this._marshalBinary();

    return this._binary;
  }

  hash(): Buffer {
    if (this._payloadHash) {
      return this._payloadHash;
    }

    this._payloadHash = sha256(this.marshalBinary());

    return this._payloadHash;
  }

  protected abstract _marshalBinary(): Buffer;
}
