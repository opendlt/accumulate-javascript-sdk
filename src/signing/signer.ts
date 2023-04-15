import { SignatureType } from "../../new/core";
import { AccURL, ACME_TOKEN_URL } from "../acc-url";
import { sha256 } from "../crypto";
import { Transaction } from "../transaction";

export interface Signer {
  signRaw(data: Uint8Array): Promise<Uint8Array>;
  get publicKey(): Uint8Array;
  get publicKeyHash(): Uint8Array;
  get type(): SignatureType;
}

export type SignerInfo = {
  type: SignatureType;
  url: AccURL;
  publicKey: Uint8Array;
  version: number;
};

export type Signature = {
  signerInfo: SignerInfo;
  signature: Uint8Array;
};


/**
 * Class to sign Transactions using a Signer
 */
export class TxSigner {
  protected readonly _url: AccURL;
  protected readonly _signer: Signer;
  protected readonly _version: number;

  constructor(url: string | AccURL, signer: Signer, version?: number) {
    this._url = AccURL.parse(url);
    this._signer = signer;
    this._version = version ?? 1;
  }

  /**
   * Helper to create a new instance of TxSigner with a new version
   * while copying other TxSigner attributes
   * @param signer original TxSigner
   * @param version new version
   * @returns
   */
  static withNewVersion(signer: TxSigner, version: number): TxSigner {
    return new TxSigner(signer.info.url, signer.signer, version);
  }

  get signer(): Signer {
    return this._signer;
  }

  get url(): AccURL {
    return this._url;
  }

  get publicKey(): Uint8Array {
    return this._signer.publicKey;
  }

  get publicKeyHash(): Uint8Array {
    return this._signer.publicKeyHash;
  }

  get version(): number {
    return this._version;
  }

  get info(): SignerInfo {
    return {
      url: this.url,
      publicKey: this.publicKey,
      version: this.version,
      type: this._signer.type,
    };
  }

  toString() {
    return this._url.toString();
  }

  async sign(tx: Transaction): Promise<Signature> {
    return {
      signerInfo: this.info,
      signature: await this._signer.signRaw(tx.dataForSignature(this.info)),
    };
  }
}

/**
 * A Lite Identity
 */
export class LiteSigner extends TxSigner {
  /**
   * Construct a LiteIdentity controlled by the Signer.
   * @param signer
   */
  constructor(signer: Signer) {
    super(LiteSigner.computeUrl(signer.publicKeyHash), signer);
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
