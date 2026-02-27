/**
 * Example 01: Lite Identities
 *
 * Demonstrates:
 *   - Generating an Ed25519 key pair
 *   - Deriving a Lite Identity (LID) and Lite Token Account (LTA)
 *   - Funding via faucet
 *   - Polling for balance
 *   - Adding credits to the LID
 *   - Sending tokens between two lite accounts
 *   - Querying final balances
 *
 * Aligned with:
 *   - Python: example_01_lite_identities.py
 *   - Rust:   example_01_lite_identities.rs
 *   - Dart:   example_01_lite_identities.dart
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

// ── Configuration ─────────────────────────────────────────────────────────
const V2_ENDPOINT = process.env.ACCUMULATE_V2_URL || KERMIT_V2;
const V3_ENDPOINT = process.env.ACCUMULATE_V3_URL || KERMIT_V3;

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 01: Lite Identities                               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  // ── Step 1: Create client ──────────────────────────────────────────────
  const client = Accumulate.custom(V2_ENDPOINT, V3_ENDPOINT);
  console.log(`Connected to: ${V2_ENDPOINT}`);

  // ── Step 2: Generate two key pairs ─────────────────────────────────────
  const kp1 = Ed25519KeyPair.generate();
  const kp2 = Ed25519KeyPair.generate();

  const lid1 = kp1.deriveLiteIdentityUrl();
  const lta1 = kp1.deriveLiteTokenAccountUrl();
  const lid2 = kp2.deriveLiteIdentityUrl();
  const lta2 = kp2.deriveLiteTokenAccountUrl();

  console.log(`Key Pair 1:`);
  console.log(`  Public Key Hash: ${kp1.publicKeyHashHex()}`);
  console.log(`  Lite Identity:   ${lid1}`);
  console.log(`  Lite Token Acct: ${lta1}`);
  console.log();
  console.log(`Key Pair 2:`);
  console.log(`  Public Key Hash: ${kp2.publicKeyHashHex()}`);
  console.log(`  Lite Identity:   ${lid2}`);
  console.log(`  Lite Token Acct: ${lta2}`);
  console.log();

  // ── Step 3: Fund via faucet ────────────────────────────────────────────
  console.log("Funding LTA1 via faucet (5 times)...");
  await client.faucet(lta1, 5, 500);

  console.log("Polling for balance...");
  const balance = await pollForBalance(client, lta1);
  console.log(`  LTA1 balance: ${balance}`);
  console.log();

  // ── Step 4: Add credits to LID1 ───────────────────────────────────────
  console.log("Adding credits to LID1...");
  const oracle = await client.getOraclePrice();
  console.log(`  Oracle price: ${oracle}`);

  const creditsNeeded = 50000;
  const acmeAmount = calculateCreditsToAcme(creditsNeeded, oracle);
  console.log(`  Purchasing ${creditsNeeded} credits for ${acmeAmount} ACME units`);

  const signer1 = new SmartSigner(client, kp1.toKey(), lid1);
  const addCreditsBody = TxBody.addCredits(lid1, acmeAmount, oracle);
  const creditResult = await signer1.signSubmitAndWait(lta1, addCreditsBody);
  console.log(`  Add credits result: ${creditResult.success ? "SUCCESS" : "FAILED"}`);
  if (creditResult.txid) console.log(`  TxID: ${creditResult.txid}`);
  if (creditResult.error) console.log(`  Error: ${creditResult.error}`);
  console.log();

  // ── Step 5: Send tokens from LTA1 to LTA2 ─────────────────────────────
  console.log("Sending 1 ACME from LTA1 to LTA2...");
  const sendAmount = BigInt(1_0000_0000); // 1 ACME = 1e8 smallest units
  const sendBody = TxBody.sendTokensSingle(lta2, sendAmount);
  const sendResult = await signer1.signSubmitAndWait(lta1, sendBody);
  console.log(`  Send tokens result: ${sendResult.success ? "SUCCESS" : "FAILED"}`);
  if (sendResult.txid) console.log(`  TxID: ${sendResult.txid}`);
  if (sendResult.error) console.log(`  Error: ${sendResult.error}`);
  console.log();

  // ── Step 6: Query final balances ───────────────────────────────────────
  console.log("Querying final balances...");
  await sleep(3000); // Wait for settlement
  try {
    const res1 = await client.queryAccount(lta1);
    const bal1 = res1?.data?.balance ?? res1?.balance ?? "unknown";
    console.log(`  LTA1 balance: ${bal1}`);
  } catch (e: any) {
    console.log(`  LTA1 query error: ${e.message}`);
  }
  try {
    const res2 = await client.queryAccount(lta2);
    const bal2 = res2?.data?.balance ?? res2?.balance ?? "unknown";
    console.log(`  LTA2 balance: ${bal2}`);
  } catch (e: any) {
    console.log(`  LTA2 query error: ${e.message}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────
  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 01 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
