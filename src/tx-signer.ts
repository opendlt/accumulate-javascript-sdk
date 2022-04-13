import { AccURL } from "./acc-url";
import { Signature, Signer, SignerInfo } from "./signer";
import { Transaction } from "./transaction";

/**
 * Class to sign Transactions using a Signer
 */
export class TxSigner {
  protected readonly _url: AccURL;
  protected readonly _signer: Signer;
  protected readonly _version: number;

  constructor(url: string | AccURL, signer: Signer, version?: number) {
    this._url = AccURL.toAccURL(url);
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
