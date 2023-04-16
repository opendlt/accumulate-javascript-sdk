import { KeySignature, SignatureType } from ".././core";
import { URL } from ".././url";
import { ACME_TOKEN_URL } from "../acc-url";
import { sha256 } from "../crypto";

export interface Signer {
  signRaw(data: Uint8Array): Promise<Uint8Array>;
  get publicKey(): Uint8Array;
  get publicKeyHash(): Uint8Array;
  get type(): SignatureType;
  newSignature(): KeySignature;
}

export type SignerInfo = {
  type: SignatureType;
  url: URL;
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
abstract class TxSigner {
  protected readonly _url: URL;
  protected readonly _signer: Signer;
  protected readonly _version: number;

  constructor(url: string | URL, signer: Signer, version?: number) {
    this._url = URL.parse(url);
    this._signer = signer;
    this._version = version ?? 1;
  }

  get signer(): Signer {
    return this._signer;
  }

  get url(): URL {
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

  sign(hash: Uint8Array): Promise<Uint8Array> {
    return this._signer.signRaw(hash);
  }

  makeSignature(opts: { timestamp?: number } = {}): KeySignature {
    const sig = this._signer.newSignature();
    sig.signer = this.url;
    sig.signerVersion = this.version;
    sig.timestamp = opts.timestamp;
    return sig;
  }
}

export class PageSigner extends TxSigner {
  /**
   * Helper to create a new instance of TxSigner with a new version
   * while copying other TxSigner attributes
   * @param signer original TxSigner
   * @param version new version
   * @returns
   */
  static withNewVersion(signer: PageSigner, version: number): PageSigner {
    return new PageSigner(signer.info.url, signer.signer, version);
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
  get acmeTokenAccount(): URL {
    return this._url.join(ACME_TOKEN_URL);
  }

  /**
   * Compute a LiteIdentity URL based on public key hash
   */
  static computeUrl(publicKeyHash: Uint8Array): URL {
    const pkHash = Buffer.from(publicKeyHash.slice(0, 20));
    const checkSum = sha256(pkHash.toString("hex")).slice(28);
    const authority = Buffer.concat([pkHash, checkSum]).toString("hex");
    return URL.parse(`acc://${authority}`);
  }
}
