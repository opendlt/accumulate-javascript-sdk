import { URL } from "url";

/**
 * An Accumulate URL (e.g: 'acc://my-identity/mydata')
 */
export class AccURL {
  private readonly _url: URL;

  constructor(url: URL) {
    if (url.protocol !== "acc:") {
      throw new Error(`Invalid protocol: ${url.protocol}`);
    }
    if (!url.hostname) {
      throw new Error("Missing authority");
    }
    this._url = url;
  }

  /**
   * Append path to url and return a *new* AccURL instance
   * @param path
   * @returns new AccURL instance with appended path
   */
  append(path: string | AccURL): AccURL {
    const pathStr = path.toString();
    let url = this._url.toString();
    if (pathStr.length > 0) {
      if (pathStr.startsWith("acc://")) {
        url += pathStr.slice(5);
      } else if (pathStr[0] === "/") {
        url += pathStr;
      } else {
        url += `/${pathStr}`;
      }
    }

    return AccURL.parse(url);
  }

  /**
   * Parse, if necessary, argument into an AccURL
   */
  static toAccURL(arg: string | AccURL): AccURL {
    return arg instanceof AccURL ? arg : AccURL.parse(arg);
  }

  /**
   * Parse a string into an AccURL
   */
  static parse(str: string): AccURL {
    const url = new URL(str);
    return new AccURL(url);
  }

  get authority(): string {
    return this._url.hostname;
  }

  get path(): string {
    return this._url.pathname;
  }

  get query(): string {
    return this._url.search;
  }

  get fragment(): string {
    return this._url.hash;
  }

  toString(): string {
    return this._url.toString();
  }
}

/**
 * The URL of the ACME token
 */
export const ACME_TOKEN_URL = AccURL.parse("acc://ACME");

/**
 * The URL of the DN
 */
export const DN_URL = AccURL.parse("acc://dn.acme");

/**
 * The URL of the anchors
 */
export const ANCHORS_URL = DN_URL.append("anchors");
