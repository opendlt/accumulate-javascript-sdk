/**
 * Unified Accumulate client facade.
 * Wraps both V2 and V3 JSON-RPC clients behind a single class with
 * static factory methods for well-known networks.
 *
 * Aligned with:
 *   - Python:  Accumulate("https://kermit.accumulatenetwork.io")
 *   - Dart:    Accumulate.network(NetworkEndpoint.testnet)
 *   - Rust:    AccumulateClient::testnet()
 */

import { Client as V2Client } from "../api_v2/client.js";
import { JsonRpcClient as V3Client } from "../api_v3/client.js";
import type { URLArgs } from "../address/index.js";
import {
  KERMIT_V2,
  KERMIT_V3,
  DEVNET_V2,
  DEVNET_V3,
  MAINNET_V2,
  MAINNET_V3,
  NetworkEndpoint,
  resolveNetwork,
} from "./network.js";

export class Accumulate {
  readonly v2: V2Client;
  readonly v3: V3Client;
  readonly v2Endpoint: string;
  readonly v3Endpoint: string;

  // ── Constructors ────────────────────────────────────────────────────────

  /**
   * Create an Accumulate client from explicit V2 and V3 endpoints.
   */
  constructor(v2Endpoint: string, v3Endpoint: string) {
    this.v2Endpoint = v2Endpoint;
    this.v3Endpoint = v3Endpoint;
    this.v2 = new V2Client(v2Endpoint);
    this.v3 = new V3Client(v3Endpoint);
  }

  // ── Static Factories ───────────────────────────────────────────────────

  /** Connect to the Kermit testnet. */
  static forKermit(): Accumulate {
    return new Accumulate(KERMIT_V2, KERMIT_V3);
  }

  /** Connect to a local devnet (127.0.0.1:26660). */
  static forDevnet(): Accumulate {
    return new Accumulate(DEVNET_V2, DEVNET_V3);
  }

  /** Connect to mainnet. */
  static forMainnet(): Accumulate {
    return new Accumulate(MAINNET_V2, MAINNET_V3);
  }

  /** Connect to a named network environment. */
  static forNetwork(net: NetworkEndpoint): Accumulate {
    const { v2, v3 } = resolveNetwork(net);
    return new Accumulate(v2, v3);
  }

  /** Create from explicit V2 and V3 endpoints. */
  static custom(v2Endpoint: string, v3Endpoint: string): Accumulate {
    return new Accumulate(v2Endpoint, v3Endpoint);
  }

  /**
   * Create from environment variables.
   *   ACCUMULATE_V2_URL  (default: Kermit V2)
   *   ACCUMULATE_V3_URL  (default: Kermit V3)
   */
  static fromEnv(): Accumulate {
    const v2 =
      (typeof process !== "undefined" && process.env?.ACCUMULATE_V2_URL) || KERMIT_V2;
    const v3 =
      (typeof process !== "undefined" && process.env?.ACCUMULATE_V3_URL) || KERMIT_V3;
    return new Accumulate(v2, v3);
  }

  // ── Convenience Methods ────────────────────────────────────────────────

  /**
   * Call the faucet (V3) to fund an account. Optionally call multiple times.
   * @param url  The lite token account URL to fund.
   * @param times  How many times to call the faucet (default 1).
   * @param delayMs  Delay between calls in ms (default 500).
   */
  async faucet(url: URLArgs, times = 1, delayMs = 500): Promise<void> {
    for (let i = 0; i < times; i++) {
      try {
        await this.v3.faucet(url);
      } catch {
        // Faucet can be flaky; swallow errors and continue
      }
      if (i < times - 1 && delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  /**
   * Get the current ACME oracle price from the network.
   * Uses V2 describe endpoint.
   */
  async getOraclePrice(): Promise<number> {
    return this.v2.queryAcmeOracle();
  }

  /**
   * Query an account by URL (V2).
   */
  async queryAccount(url: string): Promise<any> {
    return this.v2.queryUrl(url);
  }

  /**
   * Query a transaction by ID (V2).
   */
  async queryTx(txid: string): Promise<any> {
    return this.v2.queryTx(txid);
  }

  /**
   * Get the signer version for a key page (V2).
   */
  async querySignerVersion(
    signerUrl: string,
    publicKeyHash: Uint8Array,
  ): Promise<number> {
    const { AccumulateURL } = await import("../address/url.js");
    return this.v2.querySignerVersion(AccumulateURL.parse(signerUrl), publicKeyHash);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
