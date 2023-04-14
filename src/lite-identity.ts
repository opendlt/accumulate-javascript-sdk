import { AccURL, ACME_TOKEN_URL } from "./acc-url";
import { sha256 } from "./crypto";
import { Signer } from "./signer";
import { TxSigner } from "./tx-signer";

/**
 * A Lite Identity
 */
export class LiteIdentity extends TxSigner {
  /**
   * Construct a LiteIdentity controlled by the Signer.
   * @param signer
   */
  constructor(signer: Signer) {
    super(LiteIdentity.computeUrl(signer.publicKeyHash), signer);
  }

  /**
   * Helper method to get the ACME token account controled by the LiteIdentity.
   */
  get acmeTokenAccount(): AccURL {
    return this._url.join(ACME_TOKEN_URL);
  }

  /**
   * Compute a LiteIdentity URL based on public key hash
   */
  static computeUrl(publicKeyHash: Uint8Array): AccURL {
    const pkHash = Buffer.from(publicKeyHash.slice(0, 20));
    const checkSum = sha256(pkHash.toString("hex")).slice(28);
    const authority = Buffer.concat([pkHash, checkSum]).toString("hex");
    return AccURL.parse(`acc://${authority}`);
  }
}
