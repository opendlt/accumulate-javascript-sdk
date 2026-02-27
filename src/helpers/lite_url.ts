/**
 * Standalone utility functions for deriving Accumulate lite identity and
 * lite token account URLs from a public key.
 *
 * Aligned with:
 *   - Rust:   derive_lite_identity_url(), derive_lite_token_account_url()
 *   - Python: derive_lite_identity_url(), derive_lite_token_account_url()
 *   - Dart:   deriveLiteIdentityUrl(), deriveLiteTokenAccountUrl()
 */

import { Buffer, sha256 } from "../common/index.js";

/**
 * Derive a lite identity URL from a public key hash.
 *
 * Algorithm:
 *   1. Take the first 20 bytes of the key hash → hex string
 *   2. SHA256 the hex string (UTF-8 bytes)
 *   3. Take bytes [28..32] of that hash → hex string (checksum)
 *   4. Return "acc://" + keyHex + checksumHex
 *
 * @param publicKeyHash  SHA256 of the public key (32 bytes)
 * @returns The lite identity URL string, e.g. "acc://abcdef...1234"
 */
export function deriveLiteIdentityUrl(publicKeyHash: Uint8Array): string {
  const keyStr = Buffer.from(publicKeyHash.slice(0, 20)).toString("hex");
  const checkSum = sha256(Buffer.from(keyStr, "utf-8"));
  const checkStr = Buffer.from(checkSum.slice(28)).toString("hex");
  return `acc://${keyStr}${checkStr}`;
}

/**
 * Derive a lite token account URL from a public key hash.
 *
 * @param publicKeyHash  SHA256 of the public key (32 bytes)
 * @param token  Token symbol (default "ACME")
 * @returns The lite token account URL, e.g. "acc://abcdef...1234/ACME"
 */
export function deriveLiteTokenAccountUrl(
  publicKeyHash: Uint8Array,
  token = "ACME",
): string {
  return `${deriveLiteIdentityUrl(publicKeyHash)}/${token}`;
}
