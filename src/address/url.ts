import { AccumulateTxID } from "./txid";

/**
 * An Accumulate URL (e.g: 'acc://my-identity/mydata')
 */
export class AccumulateURL {
  private readonly url: URL;

  constructor(input: URL | string) {
    // eslint-disable-next-line no-useless-catch
    try {
      if (typeof input === "string") {
        if (input.indexOf("://") < 0) {
          input = "acc://" + input;
        }
        input = new URL(input);
      }
      if (input.protocol !== "acc:") {
        throw new Error(`Invalid protocol: ${input.protocol}`);
      }
      if (!input.hostname) {
        throw new Error("Missing authority");
      }
      this.url = input;
    } catch (error) {
      throw error;
    }
  }

  static parse(input: URL | string | AccumulateURL) {
    if (input instanceof AccumulateURL) return input;
    return new this(input);
  }

  asTxID() {
    if (!this.username) {
      throw new Error("URL is not a transaction ID: username is empty");
    }
    return this.withTxID(this.username);
  }

  withTxID(hash: Uint8Array | string) {
    const copy = new URL(this.toString());
    copy.username = "";
    return new AccumulateTxID(copy, hash);
  }

  /**
   * Append path to url and return a *new* AccumulateURL instance
   * @param path
   * @returns new AccumulateURL instance with appended path
   */
  join(...path: (string | AccumulateURL)[]): AccumulateURL {
    let url = this.url.toString();
    for (const elem of path) {
      const pathStr = elem.toString();
      if (pathStr.length > 0) {
        if (pathStr.startsWith("acc://")) {
          url += pathStr.slice(5);
        } else if (pathStr[0] === "/") {
          url += pathStr;
        } else {
          url += `/${pathStr}`;
        }
      }
    }

    return new AccumulateURL(url);
  }

  get username(): string {
    return this.url.username;
  }

  get authority(): string {
    return this.url.hostname;
  }

  get path(): string {
    return this.url.pathname;
  }

  get query(): string {
    return this.url.search;
  }

  get fragment(): string {
    return this.url.hash;
  }

  toString(): string {
    return this.url.toString();
  }
}
