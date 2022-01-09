import { AccURL } from "./acc-url";
import { Keypair } from "./keypair";

import nacl from "tweetnacl";
import { Transaction } from "./transaction";

export type Signature = {
  publicKey: Uint8Array;
  signature: Uint8Array;
};

type KeyPageOptions = {
  keyPageHeigt?: number;
  keyPageIndex?: number;
};

export class OriginSigner {
  private readonly _origin: AccURL;
  private readonly _keypair: Keypair;
  private readonly _keyPageHeight: number;
  private readonly _keyPageIndex: number;

  constructor(origin: string | AccURL, keypair: Keypair, keyPageOptions?: KeyPageOptions) {
    this._origin = AccURL.toAccURL(origin);
    this._keypair = keypair;
    this._keyPageHeight = keyPageOptions?.keyPageHeigt ?? 1;
    this._keyPageIndex = keyPageOptions?.keyPageIndex ?? 0;
  }

  get publicKey(): Uint8Array {
    return this._keypair.publicKey;
  }

  get url(): AccURL {
    return this._origin;
  }

  get keyPageHeigt(): number {
    return this._keyPageHeight;
  }

  get keyPageIndex(): number {
    return this._keyPageIndex;
  }

  toString() {
    return this._origin.toString();
  }

  sign(tx: Transaction): Signature {
    return this.signRaw(tx.dataForSigning());
  }

  signRaw(data: Uint8Array): Signature {
    return {
      publicKey: this._keypair.publicKey,
      signature: nacl.sign.detached(data, this._keypair.secretKey),
    };
  }
}
