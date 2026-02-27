/**
 * Network endpoint constants and presets for the Accumulate protocol.
 * Aligned with Dart, Python, and Rust SDKs.
 */

// ── Kermit Testnet ──────────────────────────────────────────────────────────
export const KERMIT_V2 = "https://kermit.accumulatenetwork.io/v2";
export const KERMIT_V3 = "https://kermit.accumulatenetwork.io/v3";

// ── Local Devnet ────────────────────────────────────────────────────────────
export const DEVNET_V2 = "http://127.0.0.1:26660/v2";
export const DEVNET_V3 = "http://127.0.0.1:26660/v3";

// ── Mainnet ─────────────────────────────────────────────────────────────────
export const MAINNET_V2 = "https://mainnet.accumulatenetwork.io/v2";
export const MAINNET_V3 = "https://mainnet.accumulatenetwork.io/v3";

/**
 * Enumeration of well-known Accumulate network environments.
 */
export enum NetworkEndpoint {
  Mainnet = "mainnet",
  Testnet = "testnet",
  Devnet = "devnet",
}

/**
 * Resolve a NetworkEndpoint enum to its V2 and V3 URLs.
 */
export function resolveNetwork(net: NetworkEndpoint): { v2: string; v3: string } {
  switch (net) {
    case NetworkEndpoint.Mainnet:
      return { v2: MAINNET_V2, v3: MAINNET_V3 };
    case NetworkEndpoint.Testnet:
      return { v2: KERMIT_V2, v3: KERMIT_V3 };
    case NetworkEndpoint.Devnet:
      return { v2: DEVNET_V2, v3: DEVNET_V3 };
    default:
      throw new Error(`Unknown network endpoint: ${net}`);
  }
}
