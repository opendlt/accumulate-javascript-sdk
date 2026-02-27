/**
 * AccumulateHelper — Mid-level convenience class with caching, faucet retry,
 * and common operations pre-wired.
 *
 * Aligned with Dart SDK's AccumulateHelper.
 */

import type { Key } from "../signing/key.js";
import type { Accumulate } from "./accumulate.js";
import { SmartSigner } from "./smart_signer.js";
import { TxBody } from "./tx_body.js";
import { calculateCreditsToAcme } from "./oracle.js";
import { pollForBalance, pollForCredits } from "./polling.js";
import type { TxResult } from "./types.js";

export class AccumulateHelper {
  private client: Accumulate;
  private cachedOracle: number | null = null;

  constructor(client: Accumulate) {
    this.client = client;
  }

  // ── Faucet ──────────────────────────────────────────────────────────────

  /**
   * Call the faucet multiple times with delay.
   * @param url  Lite token account URL to fund.
   * @param times  Number of faucet calls (default 5).
   * @param delayMs  Delay between calls in ms (default 500).
   */
  async faucet(url: string, times = 5, delayMs = 500): Promise<void> {
    await this.client.faucet(url, times, delayMs);
  }

  // ── Oracle ──────────────────────────────────────────────────────────────

  /**
   * Get oracle price (cached). Use invalidateOracle() to refresh.
   */
  async getOracle(): Promise<number> {
    if (this.cachedOracle === null) {
      this.cachedOracle = await this.client.getOraclePrice();
    }
    return this.cachedOracle;
  }

  /** Force-refresh the cached oracle price. */
  invalidateOracle(): void {
    this.cachedOracle = null;
  }

  // ── Credits ─────────────────────────────────────────────────────────────

  /**
   * Buy credits for an account.
   * @param from  Token account to spend ACME from (principal).
   * @param to  Credit account to receive credits.
   * @param credits  Desired number of credits.
   * @param signer  Key to sign with.
   * @param signerUrl  Signer URL (lite identity or key page).
   */
  async buyCredits(params: {
    from: string;
    to: string;
    credits: number;
    signer: Key;
    signerUrl: string;
  }): Promise<TxResult> {
    const oracle = await this.getOracle();
    const amount = calculateCreditsToAcme(params.credits, oracle);
    const body = TxBody.addCredits(params.to, amount, oracle);
    const ss = new SmartSigner(this.client, params.signer, params.signerUrl);
    return ss.signSubmitAndWait(params.from, body);
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  /**
   * Query the token balance of an account.
   * @param url  Token account URL.
   * @returns Balance in smallest unit, or 0.
   */
  async queryBalance(url: string): Promise<number> {
    try {
      const res = await this.client.queryAccount(url);
      return Number(res?.data?.balance ?? res?.balance ?? 0);
    } catch {
      return 0;
    }
  }

  /**
   * Query the credit balance of an account.
   * @param url  Credit account URL (lite identity or key page).
   * @returns Credit balance, or 0.
   */
  async queryCredits(url: string): Promise<number> {
    try {
      const res = await this.client.queryAccount(url);
      return Number(res?.data?.creditBalance ?? res?.creditBalance ?? 0);
    } catch {
      return 0;
    }
  }

  // ── Polling Shortcuts ───────────────────────────────────────────────────

  /**
   * Poll until the token balance reaches or exceeds the target.
   */
  async pollForBalance(
    url: string,
    target?: number,
    maxAttempts = 30,
    intervalMs = 2000,
  ): Promise<number | null> {
    return pollForBalance(this.client, url, target, maxAttempts, intervalMs);
  }

  /**
   * Poll until the credit balance reaches or exceeds the target.
   */
  async pollForCredits(
    url: string,
    target?: number,
    maxAttempts = 30,
    intervalMs = 2000,
  ): Promise<number | null> {
    return pollForCredits(this.client, url, target, maxAttempts, intervalMs);
  }

  // ── Identity & Account Creation ─────────────────────────────────────────

  /**
   * Create an ADI using SmartSigner.
   */
  async createIdentity(params: {
    principal: string;
    url: string;
    keyBookUrl: string;
    publicKeyHash: Uint8Array | string;
    signer: Key;
    signerUrl: string;
  }): Promise<TxResult> {
    const body = TxBody.createIdentity(
      params.url,
      params.keyBookUrl,
      params.publicKeyHash,
    );
    const ss = new SmartSigner(this.client, params.signer, params.signerUrl);
    return ss.signSubmitAndWait(params.principal, body);
  }

  /**
   * Create a token account under an ADI.
   */
  async createTokenAccount(params: {
    principal: string;
    url: string;
    tokenUrl?: string;
    signer: Key;
    signerUrl: string;
  }): Promise<TxResult> {
    const body = TxBody.createTokenAccount(params.url, params.tokenUrl);
    const ss = new SmartSigner(this.client, params.signer, params.signerUrl);
    return ss.signSubmitAndWait(params.principal, body);
  }

  /**
   * Create a data account under an ADI.
   */
  async createDataAccount(params: {
    principal: string;
    url: string;
    signer: Key;
    signerUrl: string;
  }): Promise<TxResult> {
    const body = TxBody.createDataAccount(params.url);
    const ss = new SmartSigner(this.client, params.signer, params.signerUrl);
    return ss.signSubmitAndWait(params.principal, body);
  }
}
