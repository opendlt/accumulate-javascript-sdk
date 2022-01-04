import { AccURL } from "../acc-url";
import { TxType } from "./tx-types";
import { uvarintMarshalBinary, stringMarshalBinary, bytesMarshalBinary } from "../encoding";
import { BasePayload } from "./base-payload";

export type CreateKeyPageArg = {
  url: string | AccURL;
  keys: (string | Uint8Array)[];
};

export class CreateKeyPage extends BasePayload {
  private readonly _url: AccURL;
  private readonly _keys: Uint8Array[];

  constructor(arg: CreateKeyPageArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._keys = arg.keys.map((key) => (key instanceof Uint8Array ? key : Buffer.from(key, "hex")));
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];
    forConcat.push(uvarintMarshalBinary(TxType.CreateKeyPage));
    forConcat.push(stringMarshalBinary(this._url.toString()));
    forConcat.push(uvarintMarshalBinary(this._keys.length));

    this._keys.forEach((key) => forConcat.push(bytesMarshalBinary(key)));

    return Buffer.concat(forConcat);
  }
}
