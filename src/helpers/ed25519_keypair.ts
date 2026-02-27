/**
 * Ed25519KeyPair — Convenience wrapper matching the naming convention of
 * aligned SDKs (Dart: Ed25519KeyPair, Python: Ed25519KeyPair, Rust: Ed25519Signer).
 *
 * Wraps the existing ED25519Key class with additional utility methods for
 * lite URL derivation, byte access, and SDK interop.
 */

import { ED25519Key } from "../signing/ed25519.js";
import { deriveLiteIdentityUrl, deriveLiteTokenAccountUrl } from "./lite_url.js";

export class Ed25519KeyPair {
  /** The underlying ED25519Key from the core signing module. */
  readonly inner: ED25519Key;

  private constructor(inner: ED25519Key) {
    this.inner = inner;
  }

  // ── Constructors ────────────────────────────────────────────────────────

  /** Generate a new random Ed25519 key pair. */
  static generate(): Ed25519KeyPair {
    return new Ed25519KeyPair(ED25519Key.generate());
  }

  /** Create from a 32-byte seed. */
  static fromSeed(seed: Uint8Array): Ed25519KeyPair {
    return new Ed25519KeyPair(ED25519Key.from(seed));
  }

  /** Create from a 64-byte private key (seed || public). */
  static fromPrivateKey(privateKey: Uint8Array): Ed25519KeyPair {
    return new Ed25519KeyPair(ED25519Key.from(privateKey));
  }

  /** Wrap an existing ED25519Key instance. */
  static fromKey(key: ED25519Key): Ed25519KeyPair {
    return new Ed25519KeyPair(key);
  }

  // ── Key Accessors ───────────────────────────────────────────────────────

  /** Raw 32-byte public key. */
  publicKeyBytes(): Uint8Array {
    return this.inner.address.publicKey;
  }

  /** Raw 64-byte secret key (seed || public). */
  privateKeyBytes(): Uint8Array {
    return this.inner.address.privateKey;
  }

  /** SHA256 hash of the public key. */
  publicKeyHash(): Uint8Array {
    return this.inner.address.publicKeyHash;
  }

  /** Hex-encoded public key hash. */
  publicKeyHashHex(): string {
    return Buffer.from(this.publicKeyHash()).toString("hex");
  }

  // ── URL Derivation ──────────────────────────────────────────────────────

  /** Derive the lite identity URL for this key. */
  deriveLiteIdentityUrl(): string {
    return deriveLiteIdentityUrl(this.publicKeyHash());
  }

  /** Derive the lite token account URL for this key. */
  deriveLiteTokenAccountUrl(token = "ACME"): string {
    return deriveLiteTokenAccountUrl(this.publicKeyHash(), token);
  }

  // ── Interop ─────────────────────────────────────────────────────────────

  /** Return the underlying Key interface for use with Signer / SmartSigner. */
  toKey(): ED25519Key {
    return this.inner;
  }
}
