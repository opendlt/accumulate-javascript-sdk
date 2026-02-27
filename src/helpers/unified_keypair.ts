/**
 * UnifiedKeyPair — Wraps any supported key type with a unified interface
 * that SmartSigner and other convenience APIs can consume.
 *
 * Aligned with Dart SDK's UnifiedKeyPair which normalizes Ed25519, RCD1,
 * BTC, ETH, RSA, ECDSA into a single type.
 */

import type { SignatureType } from "../core/index.js";
import type { Key, PublicKey, Signable, SignOptions } from "../signing/key.js";
import type { UserSignature } from "../core/index.js";
import type { ED25519Key } from "../signing/ed25519.js";
import type { RCD1Key } from "../signing/ed25519.js";
import type { SimpleExternalKey } from "../signing/key.js";

export class UnifiedKeyPair implements Key {
  /** The underlying key implementation. */
  readonly key: Key;

  /** Descriptive label for this key type (e.g. "ed25519", "btc", "eth"). */
  readonly label: string;

  private constructor(key: Key, label: string) {
    this.key = key;
    this.label = label;
  }

  // ── Key interface implementation ────────────────────────────────────────

  get address(): PublicKey {
    return this.key.address;
  }

  sign(message: Signable, args: SignOptions): Promise<UserSignature> {
    return this.key.sign(message, args);
  }

  // ── Convenience accessors ───────────────────────────────────────────────

  get publicKey(): Uint8Array {
    return this.key.address.publicKey;
  }

  get publicKeyHash(): Uint8Array {
    return this.key.address.publicKeyHash;
  }

  get signatureType(): SignatureType {
    return this.key.address.type as SignatureType;
  }

  // ── Factory constructors ────────────────────────────────────────────────

  /** Wrap an Ed25519 key. */
  static fromEd25519(key: ED25519Key): UnifiedKeyPair {
    return new UnifiedKeyPair(key, "ed25519");
  }

  /** Wrap an RCD1 key (Factom-compatible Ed25519). */
  static fromRCD1(key: RCD1Key): UnifiedKeyPair {
    return new UnifiedKeyPair(key, "rcd1");
  }

  /** Wrap a BTC (secp256k1) key. */
  static fromBTC(key: Key): UnifiedKeyPair {
    return new UnifiedKeyPair(key, "btc");
  }

  /** Wrap an ETH V2 (Baikonur) key. */
  static fromETH(key: Key): UnifiedKeyPair {
    return new UnifiedKeyPair(key, "eth");
  }

  /** Wrap an ETH V1 (legacy) key. */
  static fromETHv1(key: Key): UnifiedKeyPair {
    return new UnifiedKeyPair(key, "eth-v1");
  }

  /** Wrap an RSA key. */
  static fromRSA(key: Key): UnifiedKeyPair {
    return new UnifiedKeyPair(key, "rsa");
  }

  /** Wrap an ECDSA (P-256) key. */
  static fromECDSA(key: Key): UnifiedKeyPair {
    return new UnifiedKeyPair(key, "ecdsa");
  }

  /** Wrap any key implementing the Key interface. */
  static fromExternal(key: SimpleExternalKey): UnifiedKeyPair {
    return new UnifiedKeyPair(key, "external");
  }

  /** Wrap any key with a custom label. */
  static from(key: Key, label = "custom"): UnifiedKeyPair {
    return new UnifiedKeyPair(key, label);
  }
}
