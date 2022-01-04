import { AccURL } from "../acc-url";
import { TxType } from "./tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "../encoding";
import { BasePayload } from "./base-payload";

export type CreateKeyBookArg = {
  url: string | AccURL;
  pages: (string | AccURL)[];
};

export class CreateKeyBook extends BasePayload {
  private readonly _url: AccURL;
  private readonly _pages: AccURL[];

  constructor(arg: CreateKeyBookArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._pages = arg.pages.map(AccURL.toAccURL);
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];
    forConcat.push(uvarintMarshalBinary(TxType.CreateKeyBook));
    forConcat.push(stringMarshalBinary(this._url.toString()));
    forConcat.push(uvarintMarshalBinary(this._pages.length));

    this._pages.forEach((page) => forConcat.push(stringMarshalBinary(page.toString())));

    return Buffer.concat(forConcat);
  }
}
