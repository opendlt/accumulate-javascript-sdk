import { AccURL } from "./acc-url";

export interface Origin {
  url: AccURL;
  sign(data: Uint8Array): Signature;
}

export type Signature = {
  publicKey: Uint8Array;
  signature: Uint8Array;
};
