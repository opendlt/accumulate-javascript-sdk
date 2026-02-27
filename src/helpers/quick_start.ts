/**
 * QuickStart — Ultra-simple API for common Accumulate operations.
 * Designed for tutorials, demos, and rapid prototyping.
 *
 * Aligned with:
 *   - Rust:   QuickStart::devnet().create_wallet()
 *   - Python: QuickStart.devnet().create_wallet()
 *   - Dart:   QuickStart.custom(...).createWallet()
 */

import { Accumulate } from "./accumulate.js";
import { Ed25519KeyPair } from "./ed25519_keypair.js";
import { SmartSigner } from "./smart_signer.js";
import { TxBody } from "./tx_body.js";
import { calculateCreditsToAcme } from "./oracle.js";
import { pollForBalance } from "./polling.js";
import type { TxResult, Wallet, AdiInfo } from "./types.js";

export class QuickStart {
  private client: Accumulate;

  constructor(client: Accumulate) {
    this.client = client;
  }

  // ── Static Factories ───────────────────────────────────────────────────

  /** QuickStart connected to Kermit testnet. */
  static forKermit(): QuickStart {
    return new QuickStart(Accumulate.forKermit());
  }

  /** QuickStart connected to local devnet. */
  static forDevnet(): QuickStart {
    return new QuickStart(Accumulate.forDevnet());
  }

  /** QuickStart with custom endpoints. */
  static custom(v2Endpoint: string, v3Endpoint: string): QuickStart {
    return new QuickStart(Accumulate.custom(v2Endpoint, v3Endpoint));
  }

  /** Access the underlying Accumulate client. */
  getClient(): Accumulate {
    return this.client;
  }

  // ── Wallet Operations ──────────────────────────────────────────────────

  /**
   * Generate a new wallet (Ed25519 keypair + derived lite URLs).
   */
  createWallet(): Wallet {
    const keypair = Ed25519KeyPair.generate();
    return {
      keypair,
      liteIdentityUrl: keypair.deriveLiteIdentityUrl(),
      liteTokenAccountUrl: keypair.deriveLiteTokenAccountUrl(),
    };
  }

  /**
   * Fund a wallet by calling the faucet multiple times and waiting for balance.
   * @param wallet  The wallet to fund.
   * @param times  How many times to call the faucet (default 5).
   */
  async fundWallet(wallet: Wallet, times = 5): Promise<void> {
    const kp = wallet.keypair as Ed25519KeyPair;
    await this.client.faucet(kp.deriveLiteTokenAccountUrl(), times, 500);
    // Poll until we see a non-zero balance
    await pollForBalance(this.client, kp.deriveLiteTokenAccountUrl());
  }

  /**
   * Buy credits for a wallet's lite identity.
   * @param wallet  The wallet.
   * @param credits  Number of credits to buy (default 50000).
   */
  async buyCredits(wallet: Wallet, credits = 50000): Promise<TxResult> {
    const kp = wallet.keypair as Ed25519KeyPair;
    const lta = kp.deriveLiteTokenAccountUrl();
    const lid = kp.deriveLiteIdentityUrl();

    const oracle = await this.client.getOraclePrice();
    const amount = calculateCreditsToAcme(credits, oracle);
    const body = TxBody.addCredits(lid, amount, oracle);

    const signer = new SmartSigner(this.client, kp.toKey(), lid);
    return signer.signSubmitAndWait(lta, body);
  }

  /**
   * Get the token balance of an account.
   */
  async getBalance(url: string): Promise<number> {
    try {
      const res = await this.client.queryAccount(url);
      return Number(res?.data?.balance ?? res?.balance ?? 0);
    } catch {
      return 0;
    }
  }

  /**
   * Get the credit balance of an account.
   */
  async getCredits(url: string): Promise<number> {
    try {
      const res = await this.client.queryAccount(url);
      return Number(res?.data?.creditBalance ?? res?.creditBalance ?? 0);
    } catch {
      return 0;
    }
  }

  /**
   * Get the oracle price.
   */
  async getOraclePrice(): Promise<number> {
    return this.client.getOraclePrice();
  }

  // ── ADI Operations ─────────────────────────────────────────────────────

  /**
   * Create an ADI with key book and key page from a funded wallet.
   * @param wallet  The funded wallet.
   * @param name  ADI name (e.g. "my-adi" → "acc://my-adi.acme").
   */
  async setupADI(wallet: Wallet, name: string): Promise<AdiInfo> {
    const kp = wallet.keypair as Ed25519KeyPair;
    const lta = kp.deriveLiteTokenAccountUrl();
    const lid = kp.deriveLiteIdentityUrl();
    const keyHash = kp.publicKeyHash();

    const adiUrl = `acc://${name}.acme`;
    const keyBookUrl = `${adiUrl}/book`;
    const keyPageUrl = `${keyBookUrl}/1`;

    const body = TxBody.createIdentity(adiUrl, keyBookUrl, keyHash);
    const signer = new SmartSigner(this.client, kp.toKey(), lid);
    const result = await signer.signSubmitAndWait(lta, body);

    if (!result.success) {
      throw new Error(`Failed to create ADI: ${result.error}`);
    }

    return {
      url: adiUrl,
      keyBookUrl,
      keyPageUrl,
      keypair: kp,
    };
  }

  /**
   * Buy credits for an ADI key page.
   * @param wallet  The wallet funding the credits.
   * @param adi  The ADI info.
   * @param credits  Number of credits (default 50000).
   */
  async buyCreditsForADI(
    wallet: Wallet,
    adi: AdiInfo,
    credits = 50000,
  ): Promise<TxResult> {
    const kp = wallet.keypair as Ed25519KeyPair;
    const lta = kp.deriveLiteTokenAccountUrl();
    const lid = kp.deriveLiteIdentityUrl();

    const oracle = await this.client.getOraclePrice();
    const amount = calculateCreditsToAcme(credits, oracle);
    const body = TxBody.addCredits(adi.keyPageUrl, amount, oracle);

    const signer = new SmartSigner(this.client, kp.toKey(), lid);
    const result = await signer.signSubmitAndWait(lta, body);

    // Wait for key page credits to propagate across BVNs
    if (result.success) {
      for (let i = 0; i < 12; i++) {
        await sleep(5000);
        try {
          const v3r = await this.client.v3.query(adi.keyPageUrl) as any;
          if ((v3r?.account?.creditBalance ?? 0) > 0) break;
        } catch { /* not indexed yet */ }
      }
    }

    return result;
  }

  /**
   * Create a token account under an ADI.
   * @param adi  The ADI info.
   * @param name  Account name (e.g. "tokens" → "acc://my-adi.acme/tokens").
   * @param tokenUrl  Token type URL (default "acc://ACME").
   */
  async createTokenAccount(
    adi: AdiInfo,
    name: string,
    tokenUrl = "acc://ACME",
  ): Promise<TxResult> {
    const kp = (adi.keypair as Ed25519KeyPair);
    const accountUrl = `${adi.url}/${name}`;
    const body = TxBody.createTokenAccount(accountUrl, tokenUrl);
    const signer = new SmartSigner(this.client, kp.toKey(), adi.keyPageUrl);
    return signer.signSubmitAndWait(adi.url, body);
  }

  /**
   * Create a data account under an ADI.
   * @param adi  The ADI info.
   * @param name  Account name (e.g. "data" → "acc://my-adi.acme/data").
   */
  async createDataAccount(
    adi: AdiInfo,
    name: string,
  ): Promise<TxResult> {
    const kp = (adi.keypair as Ed25519KeyPair);
    const accountUrl = `${adi.url}/${name}`;
    const body = TxBody.createDataAccount(accountUrl);
    const signer = new SmartSigner(this.client, kp.toKey(), adi.keyPageUrl);
    return signer.signSubmitAndWait(adi.url, body);
  }

  /**
   * Write data entries to a data account.
   * @param adi  The ADI info.
   * @param dataAccountUrl  Full URL of the data account.
   * @param entries  String data entries.
   */
  async writeData(
    adi: AdiInfo,
    dataAccountUrl: string,
    entries: string[],
  ): Promise<TxResult> {
    const kp = (adi.keypair as Ed25519KeyPair);
    const body = TxBody.writeData(entries);
    const signer = new SmartSigner(this.client, kp.toKey(), adi.keyPageUrl);
    return signer.signSubmitAndWait(dataAccountUrl, body);
  }

  /**
   * Send tokens from a wallet to a destination.
   * @param wallet  The wallet to send from.
   * @param toUrl  Destination token account URL.
   * @param amount  Amount in smallest unit.
   */
  async sendTokens(
    wallet: Wallet,
    toUrl: string,
    amount: bigint | string | number,
  ): Promise<TxResult> {
    const kp = wallet.keypair as Ed25519KeyPair;
    const lta = kp.deriveLiteTokenAccountUrl();
    const lid = kp.deriveLiteIdentityUrl();
    const body = TxBody.sendTokensSingle(toUrl, amount);
    const signer = new SmartSigner(this.client, kp.toKey(), lid);
    return signer.signSubmitAndWait(lta, body);
  }

  /**
   * Send tokens from an ADI token account.
   * @param adi  The ADI info.
   * @param fromTokenAccount  Source token account URL.
   * @param toUrl  Destination token account URL.
   * @param amount  Amount in smallest unit.
   */
  async sendTokensFromADI(
    adi: AdiInfo,
    fromTokenAccount: string,
    toUrl: string,
    amount: bigint | string | number,
  ): Promise<TxResult> {
    const kp = (adi.keypair as Ed25519KeyPair);
    const body = TxBody.sendTokensSingle(toUrl, amount);
    const signer = new SmartSigner(this.client, kp.toKey(), adi.keyPageUrl);
    return signer.signSubmitAndWait(fromTokenAccount, body);
  }

  /**
   * Add a key to an ADI's key page.
   */
  async addKeyToADI(
    adi: AdiInfo,
    newKeyHash: Uint8Array | string,
  ): Promise<TxResult> {
    const kp = (adi.keypair as Ed25519KeyPair);
    const signer = new SmartSigner(this.client, kp.toKey(), adi.keyPageUrl);
    return signer.addKey(newKeyHash);
  }

  /**
   * Set multi-sig threshold on an ADI's key page.
   */
  async setMultiSigThreshold(
    adi: AdiInfo,
    threshold: number,
  ): Promise<TxResult> {
    const kp = (adi.keypair as Ed25519KeyPair);
    const signer = new SmartSigner(this.client, kp.toKey(), adi.keyPageUrl);
    return signer.setThreshold(threshold);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
