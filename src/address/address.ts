/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-namespace */

import { bases, hashes } from "multiformats/basics";
import { Signature, SignatureType } from "../core";
import { sha256 } from "../crypto";

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

export class UnknownAddress {
  readonly type = SignatureType.Unknown;
  constructor(public value: Uint8Array, public encoding: string) {}

  async format() {
    const base = Object.values(bases).find((x) => x.prefix == this.encoding);
    if (!base) throw new Error(`unknown multibase encoding '${this.encoding}'`);
    return formatMH(this.value, base);
  }
}

export class UnknownHashAddress implements Address {
  readonly type = SignatureType.Unknown;
  constructor(public publicKeyHash: Uint8Array) {}

  async format() {
    return await formatMH(this.publicKeyHash);
  }
}

export class PublicKeyHashAddress implements Address {
  constructor(public type: SignatureType, public publicKeyHash: Uint8Array) {}

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
      default:
        return await formatMH(this.publicKeyHash);
    }
  }
}

export class PublicKeyAddress extends PublicKeyHashAddress {
  static async from(type: SignatureType, publicKey: Uint8Array) {
    return new this(type, await Address.keyHash(type, publicKey), publicKey);
  }
  protected constructor(
    public type: SignatureType,
    public publicKeyHash: Uint8Array,
    public publicKey: Uint8Array
  ) {
    super(type, publicKeyHash);
  }
}

export class PrivateKeyAddress extends PublicKeyHashAddress {
  static async from(type: SignatureType, publicKey: Uint8Array, privateKey: Uint8Array) {
    return new this(type, await Address.keyHash(type, publicKey), publicKey, privateKey);
  }
  private constructor(
    public type: SignatureType,
    public publicKeyHash: Uint8Array,
    public publicKey: Uint8Array,
    public privateKey: Uint8Array
  ) {
    super(type, publicKeyHash);
  }
}

async function doChecksum(...parts: Uint8Array[]) {
  const c = await crypto.subtle.digest("SHA-256", concat(parts));
  const cc = await crypto.subtle.digest("SHA-256", c);
  return new Uint8Array(cc);
}

async function formatMH(
  hash: Uint8Array,
  codec: { encode: (input: Uint8Array) => string } = bases.base58btc
) {
  const digested = hashes.identity.digest(hash).bytes;
  const checksum = (await doChecksum(string2bytes("MH"), digested)).slice(0, 4);
  const encoded = codec.encode(concat([digested, checksum]));
  return "MH" + encoded;
}

async function formatAC1(hash: Uint8Array) {
  const checksum = (await doChecksum(string2bytes("AC1"), hash)).slice(0, 4);
  const encoded = bases.base58btc.baseEncode(concat([hash, checksum]));
  return "AC1" + encoded;
}

function formatFA(hash: Uint8Array) {
  return formatWithPrefix(new Uint8Array([0x5f, 0xb1]), hash);
}

async function formatBTC(hash: Uint8Array) {
  return "BT" + (await formatWithPrefix(new Uint8Array([0x00]), hash));
}

async function formatETH(hash: Uint8Array) {
  if (hash.length > 20) {
    hash = hash.slice(0, 20);
  }
  return "0x" + bytes2hex(hash);
}

async function formatWithPrefix(prefix: Uint8Array, hash: Uint8Array) {
  const checksum = (await doChecksum(prefix, hash)).slice(0, 4);
  return bases.base58btc.baseEncode(concat([prefix, hash, checksum]));
}

function bytes2hex(b: Uint8Array) {
  return Buffer.from(b).toString("hex");
}

function string2bytes(s: string): Uint8Array {
  return Buffer.from(s, "utf-8");
}

function concat(parts: Uint8Array[]) {
  const merged = new Uint8Array(parts.reduce((v, part) => v + part.length, 0));
  let n = 0;
  for (const part of parts) {
    merged.set(part, n);
    n += part.length;
  }
  return merged;
}
