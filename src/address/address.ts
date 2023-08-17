/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-namespace */

import { Buffer } from "../common/buffer";
import { sha256 } from "../common/crypto";
import { Signature, SignatureType } from "../core";
import { uvarintMarshalBinary } from "../encoding/encoding";

export namespace Address {
  export async function keyHash(type: SignatureType, publicKey: Uint8Array) {
    switch (type) {
      case SignatureType.ED25519:
      case SignatureType.LegacyED25519:
        return await sha256(publicKey);
      case SignatureType.RCD1:
        return await sha256(await sha256(concat([new Uint8Array([1]), publicKey])));
      case SignatureType.ETH:
      case SignatureType.BTC:
      case SignatureType.BTCLegacy:
        throw new Error(`${type} keys are not currently supported`);
      default:
        throw new Error(`${type} is not a key signature type`);
    }
  }

  export function fromKey(type: SignatureType, publicKey: Uint8Array): Promise<PublicKeyAddress> {
    return PublicKeyAddress.from(type, publicKey);
  }

  export function fromKeyHash(
    type: SignatureType,
    publicKeyHash: Uint8Array
  ): Promise<PublicKeyHashAddress> {
    return Promise.resolve(new PublicKeyHashAddress(type, publicKeyHash));
  }

  export async function fromSignature(sig: Signature): Promise<PublicKeyAddress> {
    switch (sig.type) {
      case SignatureType.ED25519:
      case SignatureType.LegacyED25519:
      case SignatureType.RCD1:
      case SignatureType.ETH:
      case SignatureType.BTC:
      case SignatureType.BTCLegacy:
        return await PublicKeyAddress.from(sig.type, sig.publicKey!);
      case SignatureType.Delegated:
        return fromSignature(sig.signature!);
      default:
        throw new Error(`${sig.type} is not a key signature type`);
    }
  }
}

export interface Address {
  type: SignatureType;
  publicKey?: Uint8Array;
  publicKeyHash?: Uint8Array;
  privateKey?: Uint8Array;
  format(): Promise<string>;
}

// export class UnknownAddress {
//   readonly type = SignatureType.Unknown;
//   constructor(public readonly value: Uint8Array, public readonly encoding: string) {}

//   async format() {
//     const base = Object.values(bases).find((x) => x.prefix == this.encoding);
//     if (!base) throw new Error(`unknown multibase encoding '${this.encoding}'`);
//     return formatMH(this.value, base);
//   }
// }

// export class UnknownHashAddress implements Address {
//   readonly type = SignatureType.Unknown;
//   constructor(public readonly publicKeyHash: Uint8Array) {}

//   async format() {
//     return await formatMH(this.publicKeyHash);
//   }
// }

export class PublicKeyHashAddress implements Address {
  constructor(public readonly type: SignatureType, public readonly publicKeyHash: Uint8Array) {}

  async format() {
    switch (this.type) {
      case SignatureType.ED25519:
      case SignatureType.LegacyED25519:
        return await formatAC1(this.publicKeyHash);
      case SignatureType.RCD1:
        return await formatFA(this.publicKeyHash);
      case SignatureType.ETH:
        return await formatETH(this.publicKeyHash);
      case SignatureType.BTC:
      case SignatureType.BTCLegacy:
        return await formatBTC(this.publicKeyHash);
      case SignatureType.Unknown:
        return await formatMH(this.publicKeyHash);
      default:
        throw new Error(`${this.type} is not a key signature type`);
    }
  }
}

export class PublicKeyAddress extends PublicKeyHashAddress {
  static async from(type: SignatureType, publicKey: Uint8Array) {
    return new this(type, await Address.keyHash(type, publicKey), publicKey);
  }
  protected constructor(
    public readonly type: SignatureType,
    public readonly publicKeyHash: Uint8Array,
    public readonly publicKey: Uint8Array
  ) {
    super(type, publicKeyHash);
  }
}

export class PrivateKeyAddress extends PublicKeyHashAddress {
  static async from(type: SignatureType, publicKey: Uint8Array, privateKey: Uint8Array) {
    return new this(type, await Address.keyHash(type, publicKey), publicKey, privateKey);
  }
  private constructor(
    public readonly type: SignatureType,
    public readonly publicKeyHash: Uint8Array,
    public readonly publicKey: Uint8Array,
    public readonly privateKey: Uint8Array
  ) {
    super(type, publicKeyHash);
  }
}

async function doChecksum(...parts: Uint8Array[]) {
  const c = await sha256(concat(parts));
  return await sha256(c);
}

function formatAC1(hash: Uint8Array) {
  return formatWithPrefix2("AC1", hash);
}

function formatFA(hash: Uint8Array) {
  return formatWithPrefix1(new Uint8Array([0x5f, 0xb1]), hash);
}

async function formatBTC(hash: Uint8Array) {
  return "BT" + (await formatWithPrefix1(new Uint8Array([0x00]), hash));
}

async function formatETH(hash: Uint8Array) {
  if (hash.length > 20) {
    hash = hash.slice(0, 20);
  }
  return "0x" + bytes2hex(hash);
}

async function formatMH(hash: Uint8Array) {
  const mh = concat([
    uvarintMarshalBinary(0x00), // Hash type = identity
    uvarintMarshalBinary(hash.length),
    hash,
  ]);
  const checksum = (await doChecksum(string2bytes("MH"), mh)).slice(0, 4);
  return "MHz" + Alphabet.base58.encode(concat([mh, checksum]));
}

async function formatWithPrefix1(prefix: Uint8Array, hash: Uint8Array) {
  const checksum = (await doChecksum(prefix, hash)).slice(0, 4);
  return Alphabet.base58.encode(concat([prefix, hash, checksum]));
}

async function formatWithPrefix2(prefix: string, hash: Uint8Array) {
  const checksum = (await doChecksum(string2bytes(prefix), hash)).slice(0, 4);
  return prefix + Alphabet.base58.encode(concat([hash, checksum]));
}

function bytes2hex(b: Uint8Array) {
  return Buffer.from(b).toString("hex");
}

function string2bytes(s: string) {
  return Buffer.from(s, "utf-8");
}

// function bytes2string(b: Uint8Array) {
//   return Buffer.from(b).toString("utf-8");
// }

function concat(parts: Uint8Array[]) {
  const merged = new Uint8Array(parts.reduce((v, part) => v + part.length, 0));
  let n = 0;
  for (const part of parts) {
    merged.set(part, n);
    n += part.length;
  }
  return merged;
}

// From github.com/mr-tron/base58@v1.2.0/alphabet.go
class Alphabet {
  // btc is the bitcoin base58 alphabet.
  static base58 = new Alphabet("123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz");

  private readonly _encode: Uint8Array;
  private readonly _decode: Int8Array;

  constructor(s: string) {
    if (s.length != 58) {
      throw new Error("base58 alphabets must be 58 bytes long");
    }

    this._encode = Buffer.from(s, "utf-8");
    this._decode = new Int8Array(128);
    for (let i = 0; i < this._decode.length; i++) {
      this._decode[i] = -1;
    }
    for (let i = 0; i < this._encode.length; i++) {
      const b = this._encode[i];
      this._decode[b] = i;
    }
  }

  encode(bin: Uint8Array): string {
    let size = bin.length;

    let zcount = 0;
    while (zcount < size && bin[zcount] == 0) {
      zcount++;
    }

    // It is crucial to make this as short as possible, especially for
    // the usual case of bitcoin addrs
    size =
      zcount +
      // This is an integer simplification of
      // ceil(log(256)/log(58))
      ((size - zcount) * 555) / 406 +
      1;
    size = size >> 0; // Floor

    const out = new Uint8Array(size);

    let i, high; //int
    let carry = 0; //uint32

    high = size - 1;
    for (const b of bin) {
      i = size - 1;
      for (carry = b; i > high || carry != 0; i--) {
        carry = carry + 256 * out[i];
        out[i] = carry % 58;
        carry = (carry / 58) >> 0; // Hack to get integer division
      }
      high = i;
    }

    // Determine the additional "zero-gap" in the buffer (aside from zcount)
    for (i = zcount; i < size && out[i] == 0; i++);

    // Now encode the values with actual alphabet in-place
    const val = out.slice(i - zcount);
    size = val.length;
    for (i = 0; i < size; i++) {
      out[i] = this._encode[val[i]];
    }

    return Buffer.from(out.slice(0, size)).toString("utf-8");
  }
}
