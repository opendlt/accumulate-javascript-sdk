import { URL, URLArgs } from "../address";
import { Buffer } from "../common/buffer";
import { sha256 } from "../common/crypto";
import type { Transaction, UserSignature } from "../core";
import type { Key, SignOptions } from "./key";

export class Signer {
  constructor(public readonly key: Key, public readonly url: URL) {}

  static forPage(url: URLArgs, key: Key) {
    return Promise.resolve(new Signer(key, URL.parse(url)));
  }

  static async forLite(key: Key) {
    const keyStr = Buffer.from(key.address.publicKeyHash.slice(0, 20)).toString("hex");
    const checkSum = (await sha256(Buffer.from(keyStr, "utf-8"))) as Uint8Array;
    const checkStr = Buffer.from(checkSum.slice(28)).toString("hex");
    const url = URL.parse(keyStr + checkStr);
    return new SignerWithVersion(key, url, 1);
  }

  sign(
    message: Uint8Array | Transaction,
    opts: Omit<SignOptions, "signer">
  ): Promise<UserSignature> {
    return this.key.sign(message, {
      ...opts,
      signer: this.url,
    });
  }

  withVersion(version: number) {
    return new SignerWithVersion(this.key, this.url, version);
  }
}

export class SignerWithVersion extends Signer {
  constructor(key: Key, url: URL, public readonly version: number) {
    super(key, url);
  }

  sign(
    message: Uint8Array | Transaction,
    opts: Omit<SignOptions, "signer" | "signerVersion">
  ): Promise<UserSignature> {
    return this.key.sign(message, {
      ...opts,
      signer: this.url,
      signerVersion: this.version,
    });
  }
}
