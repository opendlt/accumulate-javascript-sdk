import { AccURL } from "./acc-url";
import { Transaction } from "./transaction";

export interface Signer {
  sign(tx: Transaction): Promise<Signature>;
  get info(): SignerInfo;
  get url(): AccURL;
  get publicKey(): Uint8Array;
  get publicKeyHash(): Uint8Array;
  get version(): number;
}

export type SignerInfo = {
  url: AccURL;
  publicKey: Uint8Array;
  version: number;
};

export type Signature = {
  signerInfo: SignerInfo;
  signature: Uint8Array;
};

export abstract class BaseSigner implements Signer {
  abstract sign(tx: Transaction): Promise<Signature>;
  abstract get url(): AccURL;
  abstract get publicKey(): Uint8Array;
  abstract get publicKeyHash(): Uint8Array;
  abstract get version(): number;

  get info(): SignerInfo {
    return {
      url: this.url,
      publicKey: this.publicKey,
      version: this.version,
    };
  }
}
