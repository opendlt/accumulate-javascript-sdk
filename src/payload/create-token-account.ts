import { AccURL } from "../acc-url";
import { bytesMarshalBinary, stringMarshalBinary, uvarintMarshalBinary } from "../encoding";
import { marshalBinaryReceipt, Receipt } from "../receipt";
import { TransactionType } from "../tx-types";
import { BasePayload } from "./base-payload";
import { CreateToken, CreateTokenArg } from "./create-token";

export type CreateTokenAccountArg = {
  url: string | AccURL;
  tokenUrl: string | AccURL;
  authorities?: (string | AccURL)[];
  proof?: TokenIssuerProof;
};

export type TokenIssuerProof = {
  transaction: CreateToken | CreateTokenArg;
  receipt: Receipt;
};

export class CreateTokenAccount extends BasePayload {
  private readonly _url: AccURL;
  private readonly _tokenUrl: AccURL;
  private readonly _authorities: AccURL[];
  private readonly _proof?: TokenIssuerProof;

  constructor(arg: CreateTokenAccountArg) {
    super();
    this._url = AccURL.toAccURL(arg.url);
    this._tokenUrl = AccURL.toAccURL(arg.tokenUrl);
    this._authorities = arg?.authorities?.map((a) => AccURL.toAccURL(a)) || [];
    this._proof = arg.proof;
  }

  protected _marshalBinary(): Buffer {
    const forConcat = [];

    forConcat.push(uvarintMarshalBinary(TransactionType.CreateTokenAccount, 1));
    forConcat.push(stringMarshalBinary(this._url.toString(), 2));
    forConcat.push(stringMarshalBinary(this._tokenUrl.toString(), 3));

    if (this._authorities.length > 0) {
      this._authorities.forEach((a) => forConcat.push(stringMarshalBinary(a.toString(), 7)));
    }

    if (this._proof) {
      forConcat.push(bytesMarshalBinary(marshalBinaryProof(this._proof), 8));
    }

    return Buffer.concat(forConcat);
  }
}

function marshalBinaryProof(proof: TokenIssuerProof): Buffer {
  const forConcat = [];

  const txMarshalBinary =
    proof.transaction instanceof CreateToken
      ? proof.transaction.marshalBinary()
      : new CreateToken(proof.transaction).marshalBinary();

  forConcat.push(bytesMarshalBinary(txMarshalBinary, 1));
  forConcat.push(bytesMarshalBinary(marshalBinaryReceipt(proof.receipt), 2));

  return Buffer.concat(forConcat);
}
