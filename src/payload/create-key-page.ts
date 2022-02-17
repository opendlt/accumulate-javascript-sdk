import { AccURL } from "../acc-url";
import { bytesMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export type CreateKeyPageArg = {
  url: string | AccURL;
  keys: (string | Uint8Array)[];
  manager?: string | AccURL;
};

export class CreateKeyPage extends BasePayload {
  private readonly _url: AccURL;
  private readonly _keys: Uint8Array[];
  private readonly _manager?: AccURL;

  constructor(arg: CreateKeyPageArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._keys = arg.keys.map((key) => (key instanceof Uint8Array ? key : Buffer.from(key, "hex")));
    this._manager = arg.manager ? AccURL.toAccURL(arg.manager) : undefined;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];
    forConcat.push(uvarintMarshalBinary(TransactionType.CreateKeyPage));
    forConcat.push(stringMarshalBinary(this._url.toString()));
    forConcat.push(uvarintMarshalBinary(this._keys.length));

    this._keys.forEach((key) => forConcat.push(bytesMarshalBinary(key)));
    forConcat.push(stringMarshalBinary(this._manager?.toString()));

    return Buffer.concat(forConcat);
  }
}
