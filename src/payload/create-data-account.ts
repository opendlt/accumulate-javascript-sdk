import { AccURL } from "../acc-url";
import { booleanMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { TransactionType } from "../types";
import { BasePayload } from "./base-payload";

export type CreateDataAccountArg = {
  url: string | AccURL;
  keyBookUrl?: string | AccURL;
  managerKeyBookUrl?: string | AccURL;
  scratch?: boolean;
};

export class CreateDataAccount extends BasePayload {
  private readonly _url: AccURL;
  private readonly _keyBookUrl?: AccURL;
  private readonly _managerKeyBookUrl?: AccURL;
  private readonly _scratch: boolean;

  constructor(arg: CreateDataAccountArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._keyBookUrl = arg.keyBookUrl ? AccURL.toAccURL(arg.keyBookUrl) : undefined;
    this._managerKeyBookUrl = arg.managerKeyBookUrl
      ? AccURL.toAccURL(arg.managerKeyBookUrl)
      : undefined;
    this._scratch = arg.scratch || false;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateDataAccount, 1));
    forConcat.push(stringMarshalBinary(this._url.toString(), 2));

    if (this._keyBookUrl) {
      forConcat.push(stringMarshalBinary(this._keyBookUrl.toString(), 3));
    }
    if (this._managerKeyBookUrl) {
      forConcat.push(stringMarshalBinary(this._managerKeyBookUrl?.toString(), 4));
    }
    if (this._scratch) {
      forConcat.push(booleanMarshalBinary(this._scratch, 5));
    }

    return Buffer.concat(forConcat);
  }
}
