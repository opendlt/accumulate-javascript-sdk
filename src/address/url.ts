import { AccumulateTxID } from "./txid";

export type URLArgs = AccumulateURL | URL | string;

export type URLObj = {
  scheme: string;
  hostname: string;
  username: string;
  pathname: string;
  search: string;
  hash: string;
};

export function parseURL(input: string | URL): URLObj {
  // Deal with garbage browser implementations that break if the scheme isn't HTTP/HTTPS
  let scheme: string, hostname: string;
  if (typeof input === "string") {
    const i = input.indexOf("://");
    scheme = i <= 0 ? "acc" : input.substring(0, i);
    if (i > 0) input = input.substring(i + 3);
    const u = new URL("http://" + input);
    hostname = input.substring(0, u.hostname.length);
    input = u;
  } else {
    scheme = input.protocol;
    hostname = input.hostname;
  }

  // eslint-disable-next-line prefer-const
  let { username, pathname, search, hash } = input;
  if (pathname.endsWith("/")) pathname = pathname.substring(0, pathname.length - 1);
  if (search.startsWith("?")) search = search.substring(1);
  if (hash.startsWith("#")) hash = hash.substring(1);

  return { scheme, hostname, username, pathname, search, hash };
}

/**
 * An Accumulate URL (e.g: 'acc://my-identity/mydata')
 */
export class AccumulateURL {
  private readonly url: URLObj;

  constructor(input: URL | string) {
    this.url = parseURL(input);
    if (this.url.scheme !== "acc") {
      throw new Error(`Invalid scheme: ${this.url.scheme}`);
    }
    if (!this.url.hostname) {
      throw new Error("Missing authority");
    }
  }

  static parse(input: URLArgs) {
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
    let url = this.toString();
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

  toString(opts?: { omitUser?: boolean }): string {
    let s = "acc://";
    if (!opts?.omitUser && this.username) s += this.username + "@";
    s += this.authority;
    if (this.path !== "/") s += this.path;
    if (this.query) s += "?" + this.query;
    if (this.fragment) s += "#" + this.fragment;
    return s;
  }
}
