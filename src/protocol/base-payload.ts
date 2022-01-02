import { Payload } from "../payload";

export abstract class BasePayload implements Payload {
  private _binary?: Buffer;

  marshalBinary(): Buffer {
    if (this._binary) {
      return this._binary;
    }

    this._binary = this._marshalBinary();

    return this._binary;
  }

  protected abstract _marshalBinary(): Buffer;
}
