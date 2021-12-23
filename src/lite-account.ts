import { createHash } from "crypto";
import { AccURL } from "./acc-url";
import { Keypair } from "./keypair";

export const ACME_TOKEN_URL = AccURL.parse("acc://ACME");

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
    const pkHash = createHash("sha256")
      .update(this._keypair.publicKey)
      .digest()
      .slice(0, 20);
    const checkSum = createHash("sha256")
      .update(pkHash.toString("hex"))
      .digest()
      .slice(28);
    const authority = Buffer.concat([pkHash, checkSum]).toString("hex");
    return AccURL.parse(
      `acc://${authority}/${this.tokenUrl.authority}${this.tokenUrl.path}`
    );
  }
}

