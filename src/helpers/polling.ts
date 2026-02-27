/**
 * Standalone polling utility functions for waiting on network state changes.
 *
 * Aligned with:
 *   - Rust:   poll_for_balance(), poll_for_credits(), wait_for_tx()
 *   - Python: poll_for_balance(), poll_for_credits(), wait_for_tx()
 *   - Dart:   similar helpers within SmartSigner / AccumulateHelper
 */

import type { Accumulate } from "./accumulate.js";

/**
 * Poll an account's ACME balance until it reaches or exceeds the target.
 *
 * @param client  Unified Accumulate client.
 * @param url  Token account URL to poll.
 * @param targetBalance  Target balance (in smallest unit). If undefined, polls until non-zero.
 * @param maxAttempts  Maximum number of poll attempts (default 30).
 * @param intervalMs  Milliseconds between polls (default 2000).
 * @returns The final balance, or null if timed out.
 */
export async function pollForBalance(
  client: Accumulate,
  url: string,
  targetBalance?: number,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<number | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await client.queryAccount(url);
      const balance = Number(res?.data?.balance ?? res?.balance ?? 0);
      if (targetBalance !== undefined) {
        if (balance >= targetBalance) return balance;
      } else {
        if (balance > 0) return balance;
      }
    } catch {
      // Account might not exist yet
    }
    if (i < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }
  return null;
}

/**
 * Poll an account's credit balance until it reaches or exceeds the target.
 *
 * @param client  Unified Accumulate client.
 * @param url  Credit account URL (lite identity or key page).
 * @param targetCredits  Target credit balance. If undefined, polls until non-zero.
 * @param maxAttempts  Maximum number of poll attempts (default 30).
 * @param intervalMs  Milliseconds between polls (default 2000).
 * @returns The final credit balance, or null if timed out.
 */
export async function pollForCredits(
  client: Accumulate,
  url: string,
  targetCredits?: number,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<number | null> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await client.queryAccount(url);
      const credits = Number(res?.data?.creditBalance ?? res?.creditBalance ?? 0);
      if (targetCredits !== undefined) {
        if (credits >= targetCredits) return credits;
      } else {
        if (credits > 0) return credits;
      }
    } catch {
      // Account might not exist yet
    }
    if (i < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }
  return null;
}

/**
 * Wait for a transaction to reach "delivered" status.
 *
 * @param client  Unified Accumulate client.
 * @param txid  Transaction ID string.
 * @param maxAttempts  Maximum number of poll attempts (default 30).
 * @param intervalMs  Milliseconds between polls (default 2000).
 * @returns true if delivered, false if timed out.
 */
export async function waitForTx(
  client: Accumulate,
  txid: string,
  maxAttempts = 30,
  intervalMs = 2000,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await client.queryTx(txid);
      const status = res?.status?.code ?? res?.data?.status?.code;
      if (status === "delivered") return true;
      if (status && status !== "pending" && status !== "remote") {
        throw new Error(`Transaction ${txid} failed with status: ${status}`);
      }
    } catch (err: any) {
      if (err?.message?.includes("failed with status")) throw err;
      // tx not indexed yet — keep polling
    }
    if (i < maxAttempts - 1) {
      await sleep(intervalMs);
    }
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
