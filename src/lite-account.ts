import { AccURL } from "./acc-url";
import { ACME_TOKEN_URL } from "./acme";
import { sha256 } from "./crypto";
import { Signer } from "./signer";
import { TxSigner } from "./tx-signer";

/**
 * A LiteAccount
 */
export class LiteAccount extends TxSigner {
  private readonly _tokenUrl: AccURL;

  /**
   * Construct a LiteAccount controlled by the Signer.
   * Default to ACME token if no token URL is specified.
   * @param signer
   * @param tokenUrl
   */
  constructor(signer: Signer, tokenUrl?: string | AccURL) {
    const url = tokenUrl ? AccURL.toAccURL(tokenUrl) : ACME_TOKEN_URL;
    super(LiteAccount.computeUrl(signer.publicKeyHash, url), signer);
    this._tokenUrl = url;
  }

  get tokenUrl(): AccURL {
    return this._tokenUrl;
  }

  /**
   * Compute a LiteAccount URL based on public key hash and token URL.
   */
  static computeUrl(publicKeyHash: Uint8Array, tokenUrl: AccURL): AccURL {
    const pkHash = Buffer.from(publicKeyHash.slice(0, 20));
    const checkSum = sha256(pkHash.toString("hex")).slice(28);
    const authority = Buffer.concat([pkHash, checkSum]).toString("hex");
    return AccURL.parse(`acc://${authority}/${tokenUrl.authority}${tokenUrl.path}`);
  }
}
