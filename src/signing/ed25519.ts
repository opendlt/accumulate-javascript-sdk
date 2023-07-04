import nacl from "tweetnacl";
import { PrivateKeyAddress } from "../address";
import { Buffer } from "../common/buffer";
import { sha256 } from "../common/crypto";
import { SignatureType } from "../core";
import { BaseKey, PrivateKey, PublicKey } from "./key";

abstract class BaseED25519Key extends BaseKey {
  protected constructor(public readonly address: PrivateKey) {
    super(address);
  }

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

export class ExternalED22519Key extends BaseKey {
  constructor(
    address: PublicKey,
    private readonly _sign: (hash: Uint8Array) => Promise<Uint8Array>
  ) {
    super(address);
    if (address.type != SignatureType.ED25519) {
      throw new Error(`address is ${address.type}, not ED25519`);
    }
  }

  async signRaw(args: { message: Uint8Array; sigMdHash: Uint8Array }): Promise<Uint8Array> {
    const hash = await sha256(Buffer.concat([args.sigMdHash, args.message]));
    return this._sign(hash);
  }
}

export class ExternalRCD1Key extends BaseKey {
  constructor(
    address: PublicKey,
    private readonly _sign: (hash: Uint8Array) => Promise<Uint8Array>
  ) {
    super(address);
    if (address.type != SignatureType.RCD1) {
      throw new Error(`address is ${address.type}, not RCD1`);
    }
  }

  async signRaw(args: { message: Uint8Array; sigMdHash: Uint8Array }): Promise<Uint8Array> {
    const hash = await sha256(Buffer.concat([args.sigMdHash, args.message]));
    return this._sign(hash);
  }
}
