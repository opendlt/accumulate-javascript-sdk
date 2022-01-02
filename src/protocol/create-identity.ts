import { AccURL } from "../acc-url";
import { uvarintMarshalBinary, stringMarshalBinary, bytesMarshalBinary } from "../encoding";
import { TxType } from "../tx-types";
import { BasePayload } from "./base-payload";

export type CreateIdentityArg = {
  url: string | AccURL;
  publicKey: Uint8Array;
  keyBookName: string;
  keyPageName: string;
};

export class CreateIdentity extends BasePayload {
  private readonly _url: AccURL;
  private readonly _publicKey: Uint8Array;
  private readonly _keyBookName: string;
  private readonly _keyPageName: string;

  constructor(arg: CreateIdentityArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._publicKey = arg.publicKey;
    this._keyBookName = arg.keyBookName;
    this._keyPageName = arg.keyPageName;
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TxType.CreateIdentity),
      stringMarshalBinary(this._url.toString()),
      bytesMarshalBinary(this._publicKey),
      stringMarshalBinary(this._keyBookName),
      stringMarshalBinary(this._keyPageName),
    ]);
  }
}
