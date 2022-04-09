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
