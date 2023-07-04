import { Buffer } from "../common/buffer";
import { AccumulateURL } from "./url";

export type TxIDArgs = AccumulateTxID | URL | string | AccumulateURL;

export class AccumulateTxID {
  public readonly account: AccumulateURL;
  public readonly hash: Uint8Array;

  constructor(input: AccumulateURL | URL | string, hash?: Uint8Array | string) {
    if (hash) {
      if (typeof hash === "string") {
        hash = Buffer.from(hash, "hex");
      }
      if (!(input instanceof AccumulateURL)) {
        input = new AccumulateURL(input);
      }
      if (input.username) {
        throw new Error("Username is not empty");
      }
      this.hash = hash;
      this.account = input;
      return;
    }

    if (input instanceof AccumulateURL || input instanceof URL) {
      input = new URL(input.toString()); // copy
    } else {
      input = new URL(input);
    }
    if (!input.username) {
      throw new Error("URL is not a transaction ID: username is empty");
    }

    this.hash = Buffer.from(input.username, "hex");
    input.username = "";
    this.account = new AccumulateURL(input);
  }

  static parse(input: TxIDArgs) {
    if (input instanceof AccumulateTxID) return input;
    return new this(input);
  }

  asUrl() {
    const copy = new URL(this.account.toString());
    copy.username = Buffer.from(this.hash).toString("hex");
    return new AccumulateURL(copy);
  }

  toString() {
    return this.asUrl().toString();
  }
}
