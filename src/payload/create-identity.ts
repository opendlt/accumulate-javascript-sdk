import { AccURL } from "../acc-url";
import { bytesMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export type CreateIdentityArg = {
  url: string | AccURL;
  publicKey: Uint8Array;
  keyBookName: string;
  keyPageName: string;
  manager?: string | AccURL;
};

export class CreateIdentity extends BasePayload {
  private readonly _url: AccURL;
  private readonly _publicKey: Uint8Array;
  private readonly _keyBookName: string;
  private readonly _keyPageName: string;
  private readonly _manager?: AccURL;

  constructor(arg: CreateIdentityArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._publicKey = arg.publicKey;
    this._keyBookName = arg.keyBookName;
    this._keyPageName = arg.keyPageName;
    this._manager = arg.manager ? AccURL.toAccURL(arg.manager) : undefined;
  }

  protected _marshalBinary(): Buffer {
    return Buffer.concat([
      uvarintMarshalBinary(TransactionType.CreateIdentity),
      stringMarshalBinary(this._url.toString()),
      bytesMarshalBinary(this._publicKey),
      stringMarshalBinary(this._keyBookName),
      stringMarshalBinary(this._keyPageName),
      stringMarshalBinary(this._manager?.toString()),
    ]);
  }
}
