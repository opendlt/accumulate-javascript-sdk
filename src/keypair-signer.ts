import { AccURL } from "./acc-url";
import { Keypair } from "./keypair";

import nacl from "tweetnacl";
import { Transaction } from "./transaction";
import { OriginSigner, Signature, KeyPageOptions } from "./origin-signer";

/**
 * Class to sign Transactions backed by in-memory keypair.
 */
export class KeypairSigner implements OriginSigner {
  protected readonly _origin: AccURL;
  protected readonly _keypair: Keypair;
  protected readonly _keyPageHeight: number;
  protected readonly _keyPageIndex: number;

  constructor(origin: string | AccURL, keypair: Keypair, keyPageOptions?: KeyPageOptions) {
    this._origin = AccURL.toAccURL(origin);
    this._keypair = keypair;
    this._keyPageHeight = keyPageOptions?.keyPageHeight ?? 1;
    this._keyPageIndex = keyPageOptions?.keyPageIndex ?? 0;
  }

  /**
   * Helper to create a new instance of KeypairSigner with a new origin
   * while copying other KeypairSigner attributes
   * @param signer original KeypairSigner
   * @param origin new origin
   * @returns
   */
  static withNewOrigin(signer: KeypairSigner, origin: string | AccURL): KeypairSigner {
    return new KeypairSigner(origin, signer.keypair, {
      keyPageHeight: signer.keyPageHeight,
      keyPageIndex: signer.keyPageIndex,
    });
  }

  /**
   * Helper to create a new instance of KeypairSigner with a new keyPageOptions
   * while copying other KeypairSigner attributes
   * @param signer original KeypairSigner
   * @param keyPageOptions new key page options
   * @returns
   */
  static withNewKeyPageOptions(
    signer: KeypairSigner,
    keyPageOptions: KeyPageOptions
  ): KeypairSigner {
    return new KeypairSigner(signer.origin, signer.keypair, {
      keyPageHeight: keyPageOptions.keyPageHeight ?? signer.keyPageHeight,
      keyPageIndex: keyPageOptions.keyPageIndex ?? signer.keyPageIndex,
    });
  }

  get keypair(): Keypair {
    return this._keypair;
  }

  get publicKey(): Uint8Array {
    return this._keypair.publicKey;
  }

  get origin(): AccURL {
    return this._origin;
  }

  get keyPageHeight(): number {
    return this._keyPageHeight;
  }

  get keyPageIndex(): number {
    return this._keyPageIndex;
  }

  toString() {
    return this._origin.toString();
  }

  async sign(tx: Transaction): Promise<Signature> {
    return this.signRaw(tx.dataForSignature());
  }

  /**
   * Sign arbitrary data.
   */
  async signRaw(data: Uint8Array): Promise<Signature> {
    return {
      publicKey: this._keypair.publicKey,
      signature: nacl.sign.detached(data, this._keypair.secretKey),
    };
  }
}
