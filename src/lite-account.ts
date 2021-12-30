import { sha256 } from "./crypto";
import { AccURL } from "./acc-url";
import { Keypair } from "./keypair";
import nacl from "tweetnacl";

export const ACME_TOKEN_URL = AccURL.parse("acc://ACME");

export type Signature = {
  publicKey: Uint8Array;
  signature: Uint8Array;
};

export class LiteAccount {
  private _keypair: Keypair;
  private _tokenUrl: AccURL;

  constructor(tokenUrl: AccURL, keypair: Keypair) {
    this._tokenUrl = tokenUrl;
    this._keypair = keypair;
  }

  static generate(): LiteAccount {
    return new LiteAccount(ACME_TOKEN_URL, new Keypair());
  }

  static generateWithKeypair(keypair: Keypair): LiteAccount {
    return new LiteAccount(ACME_TOKEN_URL, keypair);
  }

  static generateWithTokenUrl(tokenUrl: AccURL): LiteAccount {
    return new LiteAccount(tokenUrl, new Keypair());
  }

  get keypair(): Keypair {
    return this._keypair;
  }

  get tokenUrl(): AccURL {
    return this._tokenUrl;
  }

  getUrl(): AccURL {
    const pkHash = sha256(this._keypair.publicKey).slice(0, 20);
    const checkSum = sha256(pkHash.toString("hex")).slice(28);
    const authority = Buffer.concat([pkHash, checkSum]).toString("hex");
    return AccURL.parse(
      `acc://${authority}/${this.tokenUrl.authority}${this.tokenUrl.path}`
    );
  }

  sign(data: Uint8Array): Signature {
    return {
      publicKey: this._keypair.publicKey,
      signature: nacl.sign.detached(data, this._keypair.secretKey),
    };
  }
}
