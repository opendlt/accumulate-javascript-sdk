import { AccURL } from "./acc-url";
import { Keypair } from "./keypair";

import nacl from "tweetnacl";

export type Signature = {
  publicKey: Uint8Array;
  signature: Uint8Array;
};

export class OriginSigner {
  private readonly _url: AccURL;
  private readonly _keypair: Keypair;

  constructor(url: string | AccURL, keypair: Keypair) {
    this._url = AccURL.toAccURL(url);
    this._keypair = keypair;
  }

  get publicKey(): Uint8Array {
    return this._keypair.publicKey;
  }

  get url(): AccURL {
    return this._url;
  }

  toString() {
    return this._url.toString();
  }

  sign(data: Uint8Array): Signature {
    return {
      publicKey: this._keypair.publicKey,
      signature: nacl.sign.detached(data, this._keypair.secretKey),
    };
  }
}
