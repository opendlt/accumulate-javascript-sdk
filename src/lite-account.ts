import { sha256 } from "./crypto";
import { AccURL, ACME_TOKEN_URL } from "./acc-url";
import { Keypair } from "./keypair";
import { KeypairSigner } from "./keypair-signer";

/**
 * A LiteAccount controlled by an in-memory keypair
 */
export class LiteAccount extends KeypairSigner {
  private readonly _tokenUrl: AccURL;

  constructor(tokenUrl: string | AccURL, keypair: Keypair) {
    super(LiteAccount.computeUrl(keypair.publicKey, AccURL.toAccURL(tokenUrl)), keypair);
    this._tokenUrl = AccURL.toAccURL(tokenUrl);
  }

  /**
   * Generate a new random LiteAccount for the ACME token
   */
  static generate(): LiteAccount {
    return new LiteAccount(ACME_TOKEN_URL, new Keypair());
  }

  /**
   * Generate a new LiteAccount for the ACME token with the given keypair
   */
  static generateWithKeypair(keypair: Keypair): LiteAccount {
    return new LiteAccount(ACME_TOKEN_URL, keypair);
  }

  /**
   * Generate a new random LiteAccount for the given token URL
   */
  static generateWithTokenUrl(tokenUrl: string | AccURL): LiteAccount {
    return new LiteAccount(tokenUrl, new Keypair());
  }

  get url(): AccURL {
    return this._origin;
  }

  get tokenUrl(): AccURL {
    return this._tokenUrl;
  }

  /**
   * Compute a LiteAccount URL based on publickey and token URL.
   */
  static computeUrl(publicKey: Uint8Array, tokenUrl: AccURL): AccURL {
    const pkHash = sha256(publicKey).slice(0, 20);
    const checkSum = sha256(pkHash.toString("hex")).slice(28);
    const authority = Buffer.concat([pkHash, checkSum]).toString("hex");
    return AccURL.parse(`acc://${authority}/${tokenUrl.authority}${tokenUrl.path}`);
  }
}
