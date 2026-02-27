/**
 * Helpers module — Barrel export for the Accumulate convenience layer.
 *
 * This module provides the high-level abstractions that align the JavaScript
 * SDK with the Dart, Python, and Rust SDK fleet:
 *
 *   - Accumulate       — Unified client facade
 *   - SmartSigner      — Auto-version, sign, submit, wait
 *   - TxBody           — Transaction body factory
 *   - Ed25519KeyPair   — Key pair wrapper with URL derivation
 *   - UnifiedKeyPair   — Multi-type key wrapper
 *   - KeyManager       — Key page operations
 *   - QuickStart       — Ultra-simple API
 *   - AccumulateHelper — Mid-level convenience
 *   - Polling helpers  — pollForBalance, pollForCredits, waitForTx
 *   - Oracle helpers   — getOraclePrice, calculateCreditsToAcme
 *   - Lite URL helpers — deriveLiteIdentityUrl, deriveLiteTokenAccountUrl
 *   - Network presets  — KERMIT_V2/V3, DEVNET_V2/V3, etc.
 */

// ── Network ───────────────────────────────────────────────────────────────
export {
  KERMIT_V2,
  KERMIT_V3,
  DEVNET_V2,
  DEVNET_V3,
  MAINNET_V2,
  MAINNET_V3,
  NetworkEndpoint,
  resolveNetwork,
} from "./network.js";

// ── Client Facade ─────────────────────────────────────────────────────────
export { Accumulate } from "./accumulate.js";

// ── Core Abstractions ─────────────────────────────────────────────────────
export { SmartSigner } from "./smart_signer.js";
export type {
  SignOptions as SmartSignOptions,
  SignAndSubmitOptions,
  SignSubmitAndWaitOptions,
} from "./smart_signer.js";

export { TxBody } from "./tx_body.js";
export { UnifiedKeyPair } from "./unified_keypair.js";
export { Ed25519KeyPair } from "./ed25519_keypair.js";

// ── Convenience Layer ─────────────────────────────────────────────────────
export { KeyManager } from "./key_manager.js";
export { QuickStart } from "./quick_start.js";
export { AccumulateHelper } from "./accumulate_helper.js";

// ── Polling & Utilities ───────────────────────────────────────────────────
export { pollForBalance, pollForCredits, waitForTx } from "./polling.js";
export { getOraclePrice, calculateCreditsToAcme } from "./oracle.js";
export { deriveLiteIdentityUrl, deriveLiteTokenAccountUrl } from "./lite_url.js";

// ── Types ─────────────────────────────────────────────────────────────────
export type {
  TxResult,
  Wallet,
  AdiInfo,
  KeyPageState,
  KeyEntry,
} from "./types.js";
