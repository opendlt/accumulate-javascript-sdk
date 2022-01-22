import { AccURL } from "./acc-url";
import { Transaction } from "./transaction";

export interface OriginSigner {
  sign(tx: Transaction): Promise<Signature>;
  get origin(): AccURL;
  get keyPageHeight(): number;
  get keyPageIndex(): number;
}

export type Signature = {
  publicKey: Uint8Array;
  signature: Uint8Array;
};

export type KeyPageOptions = {
  keyPageHeight?: number;
  keyPageIndex?: number;
};
