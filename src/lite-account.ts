import { sha256 } from "./crypto";
import { AccURL, ACME_TOKEN_URL } from "./acc-url";
import { Keypair } from "./keypair";
import { KeypairSigner } from "./keypair-signer";

export class LiteAccount extends KeypairSigner {
  private readonly _tokenUrl: AccURL;

  constructor(tokenUrl: string | AccURL, keypair: Keypair) {
    super(computeUrl(keypair, AccURL.toAccURL(tokenUrl)), keypair);
    this._tokenUrl = AccURL.toAccURL(tokenUrl);
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

  get url(): AccURL {
    return this._origin;
  }

  get tokenUrl(): AccURL {
    return this._tokenUrl;
  }
}

function computeUrl(keypair: Keypair, tokenUrl: AccURL): AccURL {
  const pkHash = sha256(keypair.publicKey).slice(0, 20);
  const checkSum = sha256(pkHash.toString("hex")).slice(28);
  const authority = Buffer.concat([pkHash, checkSum]).toString("hex");
  return AccURL.parse(`acc://${authority}/${tokenUrl.authority}${tokenUrl.path}`);
}
