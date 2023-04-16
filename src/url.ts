import { URL as _URL } from "url";

/**
 * An Accumulate URL (e.g: 'acc://my-identity/mydata')
 */
export class URL {
  private readonly url: _URL;

  constructor(input: _URL | string) {
    // eslint-disable-next-line no-useless-catch
    try {
      if (typeof input === "string") {
        if (input.indexOf("://") < 0) {
          input = "acc://" + input;
        }
        input = new _URL(input);
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

  static parse(input: _URL | string | URL) {
    if (input instanceof URL) return input;
    return new this(input);
  }

  asTxID() {
    if (!this.username) {
      throw new Error("URL is not a transaction ID: username is empty");
    }
    return this.withTxID(this.username);
  }

  withTxID(hash: Uint8Array | string) {
    const copy = new _URL(this.toString());
    copy.username = "";
    return new TxID(copy, hash);
  }

  /**
   * Append path to url and return a *new* AccURL instance
   * @param path
   * @returns new AccURL instance with appended path
   */
  join(...path: (string | URL)[]): URL {
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

    return new URL(url);
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

export class TxID {
  public readonly account: URL;
  public readonly hash: Uint8Array;

  constructor(input: URL | _URL | string, hash?: Uint8Array | string) {
    if (hash) {
      if (typeof hash === "string") {
        hash = Buffer.from(hash, "hex");
      }
      if (!(input instanceof URL)) {
        input = new URL(input);
      }
      if (input.username) {
        throw new Error("Username is not empty");
      }
      this.hash = hash;
      this.account = input;
      return;
    }

    if (input instanceof URL || input instanceof _URL) {
      input = new _URL(input.toString()); // copy
    } else {
      input = new _URL(input);
    }
    if (!input.username) {
      throw new Error("URL is not a transaction ID: username is empty");
    }

    this.hash = Buffer.from(input.username, "hex");
    input.username = "";
    this.account = new URL(input);
  }

  asUrl() {
    const copy = new _URL(this.account.toString());
    copy.username = Buffer.from(this.hash).toString("hex");
    return new URL(copy);
  }

  toString() {
    return this.asUrl().toString();
  }
}
