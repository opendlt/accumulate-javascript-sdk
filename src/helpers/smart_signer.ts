/**
 * SmartSigner — High-level signing facade that auto-queries signer version,
 * builds transactions, signs, submits, and polls for delivery.
 *
 * This is the #1 alignment gap between the JS SDK and the Dart/Python/Rust
 * fleet. SmartSigner encapsulates the full transaction lifecycle:
 *
 *   1. Refresh key page version from the network
 *   2. Construct Transaction (header + body)
 *   3. Sign with correct version, timestamp, signer URL
 *   4. Build Envelope
 *   5. Submit via V2 execute-direct (with V3 fallback)
 *   6. Poll for delivery confirmation
 *   7. Return TxResult
 *
 * Aligned with:
 *   - Rust:   SmartSigner::sign_submit_and_wait()
 *   - Python: SmartSigner.sign_submit_and_wait()
 *   - Dart:   SmartSigner.signSubmitAndWait()
 */

import { Transaction, type TransactionBody } from "../core/index.js";
import { Envelope } from "../messaging/index.js";
import type { Key, Signable } from "../signing/key.js";
import type { Accumulate } from "./accumulate.js";
import type { TxResult } from "./types.js";

// ── Options ─────────────────────────────────────────────────────────────────

export interface SignOptions {
  /** Optional memo string (stored in transaction header). */
  memo?: string;
  /** Optional metadata bytes (stored in transaction header). */
  metadata?: Uint8Array;
  /** Optional delegator URLs for delegated signing. */
  delegators?: string[];
}

export interface SignAndSubmitOptions extends SignOptions {
  // Additional submit-time options can be added here.
}

export interface SignSubmitAndWaitOptions extends SignAndSubmitOptions {
  /** Maximum number of polling attempts (default 30). */
  maxAttempts?: number;
  /** Interval between polls in ms (default 2000). */
  pollInterval?: number;
}

// ── SmartSigner ─────────────────────────────────────────────────────────────

export class SmartSigner {
  private client: Accumulate;
  private keypair: Key;
  private _signerUrl: string;
  private cachedVersion: number | null = null;

  /**
   * @param client  Unified Accumulate client.
   * @param keypair  Any key implementing the Key interface (ED25519Key, RCD1Key, etc.).
   * @param signerUrl  URL of the key page or lite identity used for signing.
   */
  constructor(client: Accumulate, keypair: Key, signerUrl: string) {
    this.client = client;
    this.keypair = keypair;
    this._signerUrl = signerUrl;
  }

  /** The signer URL this SmartSigner uses. */
  get signerUrl(): string {
    return this._signerUrl;
  }

  /** The last cached signer version (null if not yet queried). */
  get version(): number | null {
    return this.cachedVersion;
  }

  /**
   * Query the current key page version from the network and cache it.
   * @returns The current version number.
   */
  async refreshVersion(): Promise<number> {
    try {
      const result = await this.client.queryAccount(this._signerUrl);
      const ver = result?.data?.version ?? result?.version ?? 1;
      this.cachedVersion = typeof ver === "number" ? ver : Number(ver);
    } catch {
      // If the key page doesn't exist yet (e.g. lite identity first use),
      // default to version 1.
      if (this.cachedVersion === null) {
        this.cachedVersion = 1;
      }
    }
    return this.cachedVersion!;
  }

  /**
   * Invalidate the cached version so the next operation will re-query.
   */
  invalidateCache(): void {
    this.cachedVersion = null;
  }

  /**
   * Query the credit balance of the signer's key page.
   */
  async getCredits(): Promise<number> {
    try {
      const result = await this.client.queryAccount(this._signerUrl);
      return result?.data?.creditBalance ?? result?.creditBalance ?? 0;
    } catch {
      return 0;
    }
  }

  // ── Core Signing ────────────────────────────────────────────────────────

  /**
   * Build and sign a transaction. Does NOT submit.
   *
   * @param principal  The account URL that is the principal of this transaction.
   * @param body  The transaction body (use TxBody factory methods).
   * @param options  Optional memo, metadata, delegators.
   * @returns The signed envelope and related objects.
   */
  async sign(
    principal: string,
    body: TransactionBody,
    options?: SignOptions,
  ): Promise<{ transaction: Transaction; envelope: Envelope }> {
    // Ensure we have a version
    if (this.cachedVersion === null) {
      await this.refreshVersion();
    }

    // Build the transaction
    const txn = new Transaction({
      header: {
        principal,
        memo: options?.memo,
        metadata: options?.metadata,
      },
      body,
    });

    // Sign with timestamp in microseconds (matching other SDKs)
    const timestamp = Date.now() * 1000;
    const sig = await this.keypair.sign(txn as Signable, {
      signer: this._signerUrl,
      signerVersion: this.cachedVersion!,
      timestamp,
      delegators: options?.delegators,
    });

    // Build envelope
    const envelope = new Envelope({
      transaction: [txn],
      signatures: [sig],
    });

    return { transaction: txn, envelope };
  }

  /**
   * Sign and submit a transaction. Does NOT wait for delivery.
   *
   * Tries V2 execute-direct first (proven JSON-based submission),
   * then falls back to V3 submit if V2 fails.
   *
   * @param principal  The principal account URL.
   * @param body  The transaction body.
   * @param options  Optional memo, metadata, delegators.
   * @returns TxResult with txid from submission response.
   */
  async signAndSubmit(
    principal: string,
    body: TransactionBody,
    options?: SignAndSubmitOptions,
  ): Promise<TxResult> {
    const { envelope } = await this.sign(principal, body, options);

    // Try V2 execute-direct first (JSON-based, well-proven)
    try {
      const response = await this.client.v2.execute(envelope);
      const txid = String(response?.txid ?? "");

      // Check the result array for errors (V2 returns an array of results)
      const resultArr = Array.isArray((response as any)?.result) ? (response as any).result : [];
      for (const item of resultArr) {
        if (item?.error || item?.message) {
          const errMsg = item.message ?? JSON.stringify(item.error);
          if (process.env.DEBUG_POLL) console.log(`  [v2 submit] result item error: ${errMsg}`);
          if (/error|fail|bad/i.test(errMsg)) {
            return {
              success: false,
              txid,
              error: errMsg,
              rawResponse: response,
            };
          }
        }
      }

      return {
        success: true,
        txid,
        rawResponse: response,
      };
    } catch (v2Err: any) {
      if (process.env.DEBUG_POLL) console.log(`  [v2 submit] error: ${v2Err?.message?.substring(0, 100)}`);
      // V2 may fail for various reasons; fall through to V3
    }

    // Fall back to V3 submit
    try {
      const response = await this.client.v3.submit(envelope);
      const txid = extractTxId(response);
      const submitError = extractSubmitError(response);

      if (submitError) {
        return {
          success: false,
          txid,
          error: submitError,
          rawResponse: response,
        };
      }

      return {
        success: true,
        txid,
        rawResponse: response,
      };
    } catch (err: any) {
      return {
        success: false,
        txid: "",
        error: err?.message ?? String(err),
        rawResponse: err,
      };
    }
  }

  /**
   * Sign, submit, and wait for delivery confirmation — the primary method.
   *
   * This is the method most examples and convenience APIs should use.
   *
   * @param principal  The principal account URL.
   * @param body  The transaction body.
   * @param options  Optional memo, metadata, delegators, polling config.
   * @returns TxResult with success/failure status.
   */
  async signSubmitAndWait(
    principal: string,
    body: TransactionBody,
    options?: SignSubmitAndWaitOptions,
  ): Promise<TxResult> {
    const maxAttempts = options?.maxAttempts ?? 30;
    const pollInterval = options?.pollInterval ?? 2000;
    const submitRetries = 5;

    // Sign and submit, retrying on transient "not found" errors
    // (the signer account may not have propagated across BVNs yet)
    let result: TxResult | undefined;
    for (let attempt = 0; attempt < submitRetries; attempt++) {
      result = await this.signAndSubmit(principal, body, options);
      if (result.success) break;
      if (result.error && /not\s*found/i.test(result.error) && attempt < submitRetries - 1) {
        await sleep(5000);
        continue;
      }
      break;
    }

    if (!result!.success || !result!.txid) {
      return result!;
    }

    // Poll for delivery
    try {
      const delivered = await this.pollForDelivery(
        result!.txid,
        maxAttempts,
        pollInterval,
      );
      if (delivered) {
        return result!;
      } else {
        return {
          ...result!,
          success: false,
          error: `Transaction ${result!.txid} not confirmed after ${maxAttempts} attempts`,
        };
      }
    } catch (err: any) {
      return {
        ...result!,
        success: false,
        error: err?.message ?? String(err),
      };
    }
  }

  // ── Convenience Methods ─────────────────────────────────────────────────

  /**
   * Add a key to the signer's key page.
   * Automatically invalidates the cached version after success.
   */
  async addKey(
    newKeyHash: Uint8Array | string,
    options?: SignSubmitAndWaitOptions,
  ): Promise<TxResult> {
    const { TxBody: TxBodyFactory } = await import("./tx_body.js");
    const body = TxBodyFactory.updateKeyPageAddKey(newKeyHash);
    const result = await this.signSubmitAndWait(this._signerUrl, body, options);
    if (result.success) this.invalidateCache();
    return result;
  }

  /**
   * Remove a key from the signer's key page.
   * Automatically invalidates the cached version after success.
   */
  async removeKey(
    keyHash: Uint8Array | string,
    options?: SignSubmitAndWaitOptions,
  ): Promise<TxResult> {
    const { TxBody: TxBodyFactory } = await import("./tx_body.js");
    const body = TxBodyFactory.updateKeyPageRemoveKey(keyHash);
    const result = await this.signSubmitAndWait(this._signerUrl, body, options);
    if (result.success) this.invalidateCache();
    return result;
  }

  /**
   * Set the acceptance threshold on the signer's key page.
   * Automatically invalidates the cached version after success.
   */
  async setThreshold(
    threshold: number,
    options?: SignSubmitAndWaitOptions,
  ): Promise<TxResult> {
    const { TxBody: TxBodyFactory } = await import("./tx_body.js");
    const body = TxBodyFactory.updateKeyPageSetThreshold(threshold);
    const result = await this.signSubmitAndWait(this._signerUrl, body, options);
    if (result.success) this.invalidateCache();
    return result;
  }

  // ── Private ─────────────────────────────────────────────────────────────

  /**
   * Poll for a transaction to reach delivered status.
   */
  private async pollForDelivery(
    txid: string,
    maxAttempts: number,
    intervalMs: number,
  ): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      // Try V2 first (works well for lite-account transactions)
      try {
        const res = await this.client.queryTx(txid);
        const statusCode = res?.status?.code ?? res?.data?.status?.code;
        if (process.env.DEBUG_POLL) console.log(`  [poll ${i}] V2: code=${statusCode}`);
        if (statusCode === "delivered") return true;
        if (
          statusCode &&
          statusCode !== "pending" &&
          statusCode !== "remote"
        ) {
          throw new Error(`Transaction failed with status: ${statusCode}`);
        }
        // V2 found it but it's still pending — keep polling
        if (i < maxAttempts - 1) {
          await sleep(intervalMs);
        }
        continue;
      } catch (err: any) {
        if (err?.message?.includes("failed with status")) throw err;
        if (process.env.DEBUG_POLL) console.log(`  [poll ${i}] V2 error: ${err?.message?.substring(0, 80)}`);
        // V2 can't find it — fall through to V3
      }

      // Try V3 query (necessary for ADI-based transactions on different BVNs)
      try {
        const v3Res = await this.client.v3.query(txid) as any;
        // V3 returns a Record with status information
        const status = v3Res?.status;
        const statusCode = status?.code;
        if (process.env.DEBUG_POLL) console.log(`  [poll ${i}] V3: code=${statusCode}, delivered=${status?.delivered}`);
        // V3 uses numeric codes: 200 = pending/accepted, 201 = delivered
        if (statusCode === 201 || status?.delivered === true) return true;
        // Check for explicit failure
        if (status?.failed === true || status?.error) {
          throw new Error(
            `Transaction failed: ${status?.error ?? JSON.stringify(status)}`,
          );
        }
      } catch (v3Err: any) {
        if (v3Err?.message?.includes("Transaction failed")) throw v3Err;
        if (process.env.DEBUG_POLL) console.log(`  [poll ${i}] V3 error: ${v3Err?.message?.substring(0, 80)}`);
        // Neither V2 nor V3 found it yet — keep polling
      }

      if (i < maxAttempts - 1) {
        await sleep(intervalMs);
      }
    }
    return false;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract a transaction ID from a V3 submit response.
 * The response can be an array of Submission objects or a single object.
 */
function extractTxId(response: any): string {
  if (!response) return "";

  // Array of submissions (V3)
  if (Array.isArray(response)) {
    for (const sub of response) {
      const id = sub?.status?.txID ?? sub?.txID ?? sub?.txid;
      if (id) return String(id);
    }
    return "";
  }

  // Single submission or V2 response
  return String(
    response?.status?.txID ??
      response?.txID ??
      response?.txid ??
      "",
  );
}

/**
 * Check V3 submit response for error messages.
 * V3 returns an array of Submission objects; if any contains an error message
 * (e.g. "load signer: ... not found"), the submit effectively failed.
 */
function extractSubmitError(response: any): string | undefined {
  if (!response) return undefined;
  const items = Array.isArray(response) ? response : [response];
  for (const item of items) {
    const msg = item?.message;
    if (typeof msg === "string" && msg.length > 0) {
      // V3 returns error details in the message field
      const code = item?.status?.code;
      if (code && code !== 200 && code !== 0) return msg;
      // Also catch "notFound" / "error" patterns in the message
      if (/not\s*found|error|failed/i.test(msg)) return msg;
    }
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
