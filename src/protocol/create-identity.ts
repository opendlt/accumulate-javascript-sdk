import { AccURL } from "../acc-url";
import { uvarintMarshalBinary, stringMarshalBinary, bytesMarshalBinary } from "../encoding";
import { TxType } from "../tx-types";
import { Payload } from "../payload";

export type CreateIdentityArg = {
  url: string | AccURL;
  publicKey: Uint8Array;
  keyBookName: string;
  keyPageName: string;
};

export class CreateIdentity implements Payload {
  private readonly _url: AccURL;
  private readonly _publicKey: Uint8Array;
  private readonly _keyBookName: string;
  private readonly _keyPageName: string;
  private _binary?: Buffer;

  constructor(arg: CreateIdentityArg) {
    this._url = arg.url instanceof AccURL ? arg.url : AccURL.parse(arg.url);
    this._publicKey = arg.publicKey;
    this._keyBookName = arg.keyBookName;
    this._keyPageName = arg.keyPageName;
  }

  marshalBinary(): Buffer {
    if (this._binary) {
      return this._binary;
    }
    this._binary = this._marshalBinary();
    return this._binary;
  }

  private _marshalBinary() {
    return Buffer.concat([
      uvarintMarshalBinary(TxType.CreateIdentity),
      stringMarshalBinary(this._url.toString()),
      bytesMarshalBinary(this._publicKey),
      stringMarshalBinary(this._keyBookName),
      stringMarshalBinary(this._keyPageName),
    ]);
  }
}
