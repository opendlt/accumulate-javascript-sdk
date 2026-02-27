/**
 * Example 06: Custom Tokens
 *
 * Demonstrates:
 *   - Creating an ADI
 *   - Creating a custom token issuer (symbol, precision)
 *   - Creating a token account for the custom token
 *   - Issuing tokens
 *   - Transferring custom tokens
 *   - Querying balances
 *
 * Aligned with:
 *   - Python: example_06_custom_tokens.py
 *   - Rust:   example_06_custom_tokens.rs
 *   - Dart:   example_06_custom_tokens.dart
 */

import {
  Accumulate,
  Ed25519KeyPair,
  SmartSigner,
  TxBody,
  pollForBalance,
  KERMIT_V2,
  KERMIT_V3,
} from "../../src/index.js";
import { calculateCreditsToAcme } from "../../src/helpers/oracle.js";

const V2_ENDPOINT = process.env.ACCUMULATE_V2_URL || KERMIT_V2;
const V3_ENDPOINT = process.env.ACCUMULATE_V3_URL || KERMIT_V3;

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 06: Custom Tokens                                 ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const client = Accumulate.custom(V2_ENDPOINT, V3_ENDPOINT);
  const oracle = await client.getOraclePrice();
  const kp = Ed25519KeyPair.generate();
  const lid = kp.deriveLiteIdentityUrl();
  const lta = kp.deriveLiteTokenAccountUrl();

  // ── Setup ──────────────────────────────────────────────────────────────
  console.log("Step 1: Setting up funded lite account and ADI...");
  await client.faucet(lta, 5, 500);
  await pollForBalance(client, lta);

  const liteSigner = new SmartSigner(client, kp.toKey(), lid);
  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.addCredits(lid, calculateCreditsToAcme(100000, oracle), oracle),
  );

  const ts = Date.now();
  const adiUrl = `acc://sdk-js-ex06-${ts}.acme`;
  const bookUrl = `${adiUrl}/book`;
  const pageUrl = `${bookUrl}/1`;

  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.createIdentity(adiUrl, bookUrl, kp.publicKeyHash()),
  );
  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.addCredits(pageUrl, calculateCreditsToAcme(50000, oracle), oracle),
  );
  console.log(`  ADI: ${adiUrl}`);
  // Wait for key page credits to propagate
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    try {
      const v3r = await client.v3.query(pageUrl) as any;
      if ((v3r?.account?.creditBalance ?? 0) > 0) break;
    } catch { /* not indexed yet */ }
  }
  console.log();

  const adiSigner = new SmartSigner(client, kp.toKey(), pageUrl);

  // ── Create custom token issuer ─────────────────────────────────────────
  const tokenUrl = `${adiUrl}/my-token`;
  const symbol = "MYTKN";
  const precision = 8;

  console.log(`Step 2: Creating custom token "${symbol}" at ${tokenUrl}...`);
  const createResult = await adiSigner.signSubmitAndWait(
    adiUrl,
    TxBody.createToken(tokenUrl, symbol, precision),
  );
  console.log(`  Create token: ${createResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Create token account for custom token ──────────────────────────────
  const customAcctUrl = `${adiUrl}/my-token-acct`;
  console.log(`Step 3: Creating token account for ${symbol}...`);
  const acctResult = await adiSigner.signSubmitAndWait(
    adiUrl,
    TxBody.createTokenAccount(customAcctUrl, tokenUrl),
  );
  console.log(`  Create account: ${acctResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Issue tokens ───────────────────────────────────────────────────────
  const issueAmount = BigInt(1000_0000_0000); // 1000 tokens
  console.log(`Step 4: Issuing ${issueAmount} units to ${customAcctUrl}...`);
  const issueResult = await adiSigner.signSubmitAndWait(
    tokenUrl,
    TxBody.issueTokens(customAcctUrl, issueAmount),
  );
  console.log(`  Issue tokens: ${issueResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Query balance ──────────────────────────────────────────────────────
  console.log("Step 5: Querying custom token account...");
  await sleep(3000);
  try {
    const res = await client.queryAccount(customAcctUrl);
    console.log(`  Balance: ${res?.data?.balance ?? res?.balance ?? "unknown"}`);
    console.log(`  Token URL: ${res?.data?.tokenUrl ?? res?.tokenUrl ?? "unknown"}`);
  } catch (e: any) {
    console.log(`  Query error: ${e.message}`);
  }

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 06 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
