import nacl from "tweetnacl";
import { PrivateKeyAddress } from "../address/index.js";
import { Buffer, sha256 } from "../common/index.js";
import { Signature, SignatureType } from "../core/index.js";
import { encode } from "../encoding/index.js";
import { BaseKey, PrivateKey, PublicKey, Signable, SimpleExternalKey } from "./key.js";

abstract class BaseED25519Key extends BaseKey {
  protected constructor(public readonly address: PrivateKey) {
    super(address);
  }

  protected static make(type: SignatureType, seedOrKey?: Uint8Array) {
    let kp: nacl.SignKeyPair;
    if (!seedOrKey) {
      kp = nacl.sign.keyPair();
    } else if (seedOrKey.length == 64) {
      kp = {
        publicKey: seedOrKey.slice(32),
        secretKey: seedOrKey,
      };
    } else if (seedOrKey.length == 32) {
      kp = nacl.sign.keyPair.fromSeed(seedOrKey);
    } else {
      throw new Error(`invalid key: expected 64 or 32 bytes, got ${seedOrKey.length}`);
    }
    return PrivateKeyAddress.from(type, kp.publicKey, kp.secretKey);
  }

  async signRaw(signature: Signature, message: Signable): Promise<Uint8Array> {
    const sigMdHash = sha256(encode(signature));
    const hash = sha256(Buffer.concat([sigMdHash, message.hash()]));
    return nacl.sign.detached(hash, this.address.privateKey);
  }
}

export class ED25519Key extends BaseED25519Key {
  static generate() {
    return new this(this.make(SignatureType.ED25519));
  }

  static from(seedOrKey: Uint8Array) {
    return new this(this.make(SignatureType.ED25519, seedOrKey));
  }
}

export class RCD1Key extends BaseED25519Key {
  static generate() {
    return new this(this.make(SignatureType.RCD1));
  }

  static from(seedOrKey: Uint8Array) {
    return new this(this.make(SignatureType.RCD1, seedOrKey));
  }
}

/**
 * @deprecated Use {@link SimpleExternalKey}
 */
export class ExternalED22519Key extends SimpleExternalKey {
  constructor(address: PublicKey, sign: (hash: Uint8Array) => Promise<Uint8Array>) {
    super(address, sign);
    if (address.type != SignatureType.ED25519) {
      throw new Error(`address is ${address.type}, not ED25519`);
    }
  }
}

/**
 * @deprecated Use {@link SimpleExternalKey}
 */
export class ExternalRCD1Key extends SimpleExternalKey {
  constructor(address: PublicKey, sign: (hash: Uint8Array) => Promise<Uint8Array>) {
    super(address, sign);
    if (address.type != SignatureType.RCD1) {
      throw new Error(`address is ${address.type}, not RCD1`);
    }
  }
}
