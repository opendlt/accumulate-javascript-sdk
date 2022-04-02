import nacl from "tweetnacl";
import { AccURL } from "./acc-url";
import { sha256 } from "./crypto";
import { Keypair } from "./keypair";
import { BaseSigner, Signature } from "./signer";
import { Transaction } from "./transaction";

/**
 * Class to sign Transactions backed by in-memory keypair.
 */
export class KeypairSigner extends BaseSigner {
  protected readonly _url: AccURL;
  protected readonly _keypair: Keypair;
  protected readonly _version: number;

  constructor(url: string | AccURL, keypair: Keypair, version?: number) {
    super();
    this._url = AccURL.toAccURL(url);
    this._keypair = keypair;
    this._version = version ?? 1;
  }

  /**
   * Helper to create a new instance of KeypairSigner with a new version
   * while copying other KeypairSigner attributes
   * @param signer original KeypairSigner
   * @param version new version
   * @returns
   */
  static withNewVersion(signer: KeypairSigner, version: number): KeypairSigner {
    return new KeypairSigner(signer.info.url, signer.keypair, version);
  }

  get keypair(): Keypair {
    return this._keypair;
  }

  get url(): AccURL {
    return this._url;
  }

  get publicKey(): Uint8Array {
    return this._keypair.publicKey;
  }

  get publicKeyHash(): Uint8Array {
    return sha256(this._keypair.publicKey);
  }

  get version(): number {
    return this._version;
  }

  toString() {
    return this._url.toString();
  }

  async sign(tx: Transaction): Promise<Signature> {
    return this.signRaw(tx.dataForSignature(this.info));
  }

  /**
   * Sign arbitrary data.
   */
  async signRaw(data: Uint8Array): Promise<Signature> {
    return {
      signerInfo: this.info,
      signature: nacl.sign.detached(data, this._keypair.secretKey),
    };
  }
}
