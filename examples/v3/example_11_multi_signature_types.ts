/**
 * Example 11: Multi-Signature Types
 *
 * Demonstrates all supported signature types:
 *   - Ed25519
 *   - RCD1 (Factom-compatible Ed25519)
 *   - BTC (secp256k1 + SHA256)
 *   - ETH V2 (secp256k1 + Keccak256, Baikonur-compatible)
 *
 * For each type: generate keypair, compute key hash, show details.
 *
 * Aligned with:
 *   - Python: example_11_multi_signature_types.py
 *   - Rust:   example_11_multi_signature_types.rs
 *   - Dart:   example_11_multi_signature_types.dart
 */

import { Buffer } from "../../src/common/index.js";
import { RCD1Key } from "../../src/signing/ed25519.js";
import { Ed25519KeyPair } from "../../src/helpers/ed25519_keypair.js";
import { Secp256k1KeyPair } from "../../src/crypto/secp256k1_keypair.js";
import { UnifiedKeyPair } from "../../src/helpers/unified_keypair.js";

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 11: Multi-Signature Types                         ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  // ── Type 1: Ed25519 ────────────────────────────────────────────────────
  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  1. Ed25519 (Standard)                                      │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  const ed25519Kp = Ed25519KeyPair.generate();
  const ed25519Unified = UnifiedKeyPair.fromEd25519(ed25519Kp.toKey());
  console.log(`  Signature Type: ${ed25519Unified.signatureType}`);
  console.log(`  Public Key:     ${Buffer.from(ed25519Kp.publicKeyBytes()).toString("hex").substring(0, 32)}...`);
  console.log(`  Key Hash:       ${ed25519Kp.publicKeyHashHex().substring(0, 32)}...`);
  console.log(`  Hash Method:    SHA256(raw_pubkey_32)`);
  console.log(`  Lite Identity:  ${ed25519Kp.deriveLiteIdentityUrl()}`);
  console.log();

  // ── Type 2: RCD1 ──────────────────────────────────────────────────────
  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  2. RCD1 (Factom-compatible Ed25519)                        │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  const rcd1Key = RCD1Key.generate();
  const rcd1Unified = UnifiedKeyPair.fromRCD1(rcd1Key);
  console.log(`  Signature Type: ${rcd1Unified.signatureType}`);
  console.log(`  Public Key:     ${Buffer.from(rcd1Key.address.publicKey).toString("hex").substring(0, 32)}...`);
  console.log(`  Key Hash:       ${Buffer.from(rcd1Key.address.publicKeyHash).toString("hex").substring(0, 32)}...`);
  console.log(`  Hash Method:    SHA256(SHA256(0x01 || raw_pubkey_32))`);
  console.log();

  // ── Type 3: BTC (secp256k1) ────────────────────────────────────────────
  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  3. BTC (secp256k1 + SHA256)                                │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  try {
    const btcKp = await Secp256k1KeyPair.generateBTC();
    const btcUnified = UnifiedKeyPair.fromBTC(btcKp);
    console.log(`  Signature Type: ${btcUnified.signatureType}`);
    console.log(`  Compressed PK:  ${Buffer.from(btcKp.publicKeyCompressed()).toString("hex").substring(0, 32)}...`);
    console.log(`  BTC Key Hash:   ${Buffer.from(btcKp.publicKeyHashBTC()).toString("hex").substring(0, 32)}...`);
    console.log(`  Hash Method:    SHA256(compressed_pubkey_33)`);
  } catch (e: any) {
    console.log(`  BTC unavailable: ${e.message}`);
  }
  console.log();

  // ── Type 4: ETH V2 (secp256k1 + Keccak256) ────────────────────────────
  console.log("┌──────────────────────────────────────────────────────────────┐");
  console.log("│  4. ETH V2 (secp256k1 + Keccak256, Baikonur)               │");
  console.log("└──────────────────────────────────────────────────────────────┘");
  try {
    const ethKp = await Secp256k1KeyPair.generateETH();
    const ethUnified = UnifiedKeyPair.fromETH(ethKp);
    console.log(`  Signature Type: ${ethUnified.signatureType}`);
    console.log(`  Uncompressed:   ${Buffer.from(ethKp.publicKeyUncompressed()).toString("hex").substring(0, 32)}...`);
    console.log(`  ETH Key Hash:   ${Buffer.from(ethKp.publicKeyHashETH()).toString("hex").substring(0, 32)}...`);
    console.log(`  Hash Method:    Keccak256(uncompressed_pubkey_64_no_prefix)`);
  } catch (e: any) {
    console.log(`  ETH unavailable: ${e.message}`);
  }
  console.log();

  // ── Summary table ──────────────────────────────────────────────────────
  console.log("┌───────────┬───────────────────────────────────────────────────┐");
  console.log("│ Type      │ Key Hash Algorithm                                │");
  console.log("├───────────┼───────────────────────────────────────────────────┤");
  console.log("│ Ed25519   │ SHA256(raw_pubkey_32)                             │");
  console.log("│ RCD1      │ SHA256(SHA256(0x01 || raw_pubkey_32))             │");
  console.log("│ BTC       │ SHA256(compressed_pubkey_33)                      │");
  console.log("│ ETH       │ Keccak256(uncompressed_pubkey_64_no_prefix)       │");
  console.log("│ RSA       │ SHA256(full_der_pubkey)                           │");
  console.log("│ ECDSA     │ SHA256(raw_pubkey)                                │");
  console.log("└───────────┴───────────────────────────────────────────────────┘");

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 11 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

main().catch(console.error);
