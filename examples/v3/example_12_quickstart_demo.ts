/**
 * Example 12: QuickStart Demo
 *
 * Demonstrates the ultra-simple QuickStart API that handles wallet creation,
 * faucet funding, ADI setup, and operations with one-liner methods.
 *
 * Aligned with:
 *   - Python: example_12_quickstart_demo.py
 *   - Rust:   example_12_quickstart_demo.rs
 *   - Dart:   example_12_quickstart_demo.dart
 */

import { QuickStart, KERMIT_V2, KERMIT_V3 } from "../../src/index.js";

const V2_ENDPOINT = process.env.ACCUMULATE_V2_URL || KERMIT_V2;
const V3_ENDPOINT = process.env.ACCUMULATE_V3_URL || KERMIT_V3;

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 12: QuickStart Demo                               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  // ── Initialize QuickStart ──────────────────────────────────────────────
  const qs = QuickStart.custom(V2_ENDPOINT, V3_ENDPOINT);

  // ── Step 1: Create wallet ──────────────────────────────────────────────
  console.log("Step 1: Creating wallet...");
  const wallet = qs.createWallet();
  console.log(`  Lite Identity:      ${wallet.liteIdentityUrl}`);
  console.log(`  Lite Token Account: ${wallet.liteTokenAccountUrl}`);
  console.log();

  // ── Step 2: Fund wallet ────────────────────────────────────────────────
  console.log("Step 2: Funding wallet via faucet...");
  await qs.fundWallet(wallet, 5);
  const balance = await qs.getBalance(wallet.liteTokenAccountUrl);
  console.log(`  Balance: ${balance}`);
  console.log();

  // ── Step 3: Buy credits ────────────────────────────────────────────────
  console.log("Step 3: Buying credits...");
  const credResult = await qs.buyCredits(wallet, 50000);
  console.log(`  Credits result: ${credResult.success ? "SUCCESS" : "FAILED"}`);
  const credits = await qs.getCredits(wallet.liteIdentityUrl);
  console.log(`  Credits: ${credits}`);
  console.log();

  // ── Step 4: Setup ADI ──────────────────────────────────────────────────
  const adiName = `qs-js-${Date.now()}`;
  console.log(`Step 4: Setting up ADI "${adiName}"...`);
  const adi = await qs.setupADI(wallet, adiName);
  console.log(`  ADI URL:      ${adi.url}`);
  console.log(`  Key Book URL: ${adi.keyBookUrl}`);
  console.log(`  Key Page URL: ${adi.keyPageUrl}`);
  console.log();

  // ── Step 5: Buy credits for ADI ────────────────────────────────────────
  console.log("Step 5: Buying credits for ADI key page...");
  const adiCredResult = await qs.buyCreditsForADI(wallet, adi, 50000);
  console.log(`  Credits result: ${adiCredResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Step 6: Create token account ───────────────────────────────────────
  console.log("Step 6: Creating token account...");
  const tokenResult = await qs.createTokenAccount(adi, "tokens");
  console.log(`  Token account: ${tokenResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Step 7: Create data account ────────────────────────────────────────
  console.log("Step 7: Creating data account...");
  const dataResult = await qs.createDataAccount(adi, "data");
  console.log(`  Data account: ${dataResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Step 8: Write data ─────────────────────────────────────────────────
  console.log("Step 8: Writing data...");
  const writeResult = await qs.writeData(adi, `${adi.url}/data`, [
    "Hello from QuickStart!",
    "JavaScript SDK aligned example",
  ]);
  console.log(`  Write data: ${writeResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Step 9: Send tokens ────────────────────────────────────────────────
  const wallet2 = qs.createWallet();
  console.log("Step 9: Sending tokens to another wallet...");
  const sendResult = await qs.sendTokens(
    wallet,
    wallet2.liteTokenAccountUrl,
    BigInt(1_0000_0000),
  );
  console.log(`  Send tokens: ${sendResult.success ? "SUCCESS" : "FAILED"}`);

  // ── Summary ────────────────────────────────────────────────────────────
  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 12 Complete                                       ║");
  console.log("║                                                            ║");
  console.log("║  QuickStart API provides ultra-simple one-liner methods    ║");
  console.log("║  for the most common Accumulate operations.                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

main().catch(console.error);
