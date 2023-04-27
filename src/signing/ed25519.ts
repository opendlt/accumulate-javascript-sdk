import nacl from "tweetnacl";
import { PrivateKeyAddress } from "../address";
import { sha256 } from "../common/crypto";
import { SignatureType } from "../core";
import { BaseKey } from "./key";

abstract class BaseED25519Key extends BaseKey {
  protected static async make(type: SignatureType, seedOrKey?: Uint8Array) {
    let kp: nacl.SignKeyPair;
    if (!seedOrKey) {
      kp = nacl.sign.keyPair();
    } else if (seedOrKey.length == 64) {
      kp = {
        publicKey: seedOrKey.slice(32),
        secretKey: seedOrKey.slice(0, 32),
      };
    } else if (seedOrKey.length == 32) {
      kp = nacl.sign.keyPair.fromSeed(seedOrKey);
    } else {
      throw new Error(`invalid key: expected 64 or 32 bytes, got ${seedOrKey.length}`);
    }
    return await PrivateKeyAddress.from(type, kp.publicKey, kp.secretKey);
  }

  async signRaw(args: { message: Uint8Array; sigMdHash: Uint8Array }): Promise<Uint8Array> {
    const hash = await sha256(Buffer.concat([args.sigMdHash, args.message]));
    return nacl.sign.detached(hash, this.address.privateKey);
  }
}

export class ED25519Key extends BaseED25519Key {
  static async generate() {
    return new this(await this.make(SignatureType.ED25519));
  }

  static async from(seedOrKey: Uint8Array) {
    return new this(await this.make(SignatureType.ED25519, seedOrKey));
  }
}

export class RCD1Key extends BaseED25519Key {
  static async generate() {
    return new this(await this.make(SignatureType.RCD1));
  }

  static async from(seedOrKey: Uint8Array) {
    return new this(await this.make(SignatureType.RCD1, seedOrKey));
  }
}
