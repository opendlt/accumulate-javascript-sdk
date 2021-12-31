import { AccURL } from "./acc-url";
import { Keypair } from "./keypair";
import { Origin, Signature } from "./origin";

import nacl from "tweetnacl";

export class Identity implements Origin {
  private readonly _url: AccURL;
  private readonly _keypair: Keypair;

  constructor(url: AccURL, keypair: Keypair) {
    this._url = url;
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
