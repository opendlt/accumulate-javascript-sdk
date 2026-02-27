/**
 * KeyManager — High-level interface for querying and managing key pages.
 *
 * Aligned with:
 *   - Rust:   KeyManager
 *   - Python: KeyManager
 *   - Dart:   KeyManager
 */

import type { Key } from "../signing/key.js";
import { Buffer } from "../common/index.js";
import type { Accumulate } from "./accumulate.js";
import { SmartSigner } from "./smart_signer.js";
import type { TxResult, KeyPageState, KeyEntry } from "./types.js";

export class KeyManager {
  private client: Accumulate;
  private keyPageUrl: string;

  /**
   * @param client  Unified Accumulate client.
   * @param keyPageUrl  URL of the key page to manage (e.g. "acc://my-adi.acme/book/1").
   */
  constructor(client: Accumulate, keyPageUrl: string) {
    this.client = client;
    this.keyPageUrl = keyPageUrl;
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  /**
   * Query the full state of the key page from the network.
   * @returns KeyPageState with version, credit balance, threshold, and keys.
   */
  async getKeyPageState(): Promise<KeyPageState> {
    let data: any;
    // Try V3 first (cross-BVN reliability), fall back to V2
    try {
      const v3Res = await this.client.v3.query(this.keyPageUrl) as any;
      data = v3Res?.account ?? v3Res?.data ?? v3Res;
    } catch {
      const res = await this.client.queryAccount(this.keyPageUrl);
      data = res?.data ?? res;
    }

    const keys: KeyEntry[] = [];
    const rawKeys = data?.keys ?? [];
    for (const k of rawKeys) {
      if (!k) continue;
      keys.push({
        keyHash: k.publicKeyHash
          ? Buffer.from(k.publicKeyHash as string, "hex").toString("hex")
          : "",
        delegate: k.delegate,
        lastUsedOn: k.lastUsedOn,
      });
    }

    return {
      url: this.keyPageUrl,
      version: data?.version ?? 1,
      creditBalance: data?.creditBalance ?? 0,
      acceptThreshold: data?.acceptThreshold ?? data?.threshold ?? 1,
      keys,
    };
  }

  /**
   * Check if a key hash exists on this key page.
   * @param keyHash  Hex string or Uint8Array of the key hash to find.
   */
  async hasKey(keyHash: Uint8Array | string): Promise<boolean> {
    const hex =
      keyHash instanceof Uint8Array
        ? Buffer.from(keyHash).toString("hex")
        : keyHash.toLowerCase();

    const state = await this.getKeyPageState();
    return state.keys.some((k) => k.keyHash.toLowerCase() === hex);
  }

  // ── Mutations ───────────────────────────────────────────────────────────

  /**
   * Create a SmartSigner bound to this key page.
   * @param keypair  The signing key (must be on this key page).
   */
  createSigner(keypair: Key): SmartSigner {
    return new SmartSigner(this.client, keypair, this.keyPageUrl);
  }

  /**
   * Add a key to this key page.
   * @param signerKeypair  The existing key on the page to sign with.
   * @param newKeyHash  SHA256 hash of the new key.
   * @param options  Optional memo, metadata.
   */
  async addKey(
    signerKeypair: Key,
    newKeyHash: Uint8Array | string,
    options?: { memo?: string },
  ): Promise<TxResult> {
    const signer = this.createSigner(signerKeypair);
    return signer.addKey(newKeyHash, options);
  }

  /**
   * Remove a key from this key page.
   * @param signerKeypair  The existing key on the page to sign with.
   * @param keyHash  SHA256 hash of the key to remove.
   * @param options  Optional memo, metadata.
   */
  async removeKey(
    signerKeypair: Key,
    keyHash: Uint8Array | string,
    options?: { memo?: string },
  ): Promise<TxResult> {
    const signer = this.createSigner(signerKeypair);
    return signer.removeKey(keyHash, options);
  }

  /**
   * Set the acceptance threshold on this key page.
   * @param signerKeypair  The existing key on the page to sign with.
   * @param threshold  New threshold value (e.g. 2 for 2-of-N).
   * @param options  Optional memo, metadata.
   */
  async setThreshold(
    signerKeypair: Key,
    threshold: number,
    options?: { memo?: string },
  ): Promise<TxResult> {
    const signer = this.createSigner(signerKeypair);
    return signer.setThreshold(threshold, options);
  }
}
