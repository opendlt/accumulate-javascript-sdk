/**
 * Example 02: ADI (Accumulate Digital Identity) Creation
 *
 * Demonstrates:
 *   - Setting up a funded lite account
 *   - Creating an ADI with key book and key page
 *   - Adding credits to the ADI key page
 *   - Querying the new ADI, key book, and key page
 *
 * Aligned with:
 *   - Python: example_02_accumulate_identities.py
 *   - Rust:   example_02_adi_creation.rs
 *   - Dart:   example_02_adi_creation.dart
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
  console.log("║  Example 02: ADI Creation                                  ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const client = Accumulate.custom(V2_ENDPOINT, V3_ENDPOINT);
  const kp = Ed25519KeyPair.generate();
  const lid = kp.deriveLiteIdentityUrl();
  const lta = kp.deriveLiteTokenAccountUrl();

  console.log(`Lite Identity:      ${lid}`);
  console.log(`Lite Token Account: ${lta}`);
  console.log();

  // ── Fund and add credits ───────────────────────────────────────────────
  console.log("Step 1: Fund via faucet...");
  await client.faucet(lta, 5, 500);
  await pollForBalance(client, lta);

  console.log("Step 2: Add credits to lite identity...");
  const oracle = await client.getOraclePrice();
  const amount = calculateCreditsToAcme(100000, oracle);
  const signer = new SmartSigner(client, kp.toKey(), lid);
  const credResult = await signer.signSubmitAndWait(
    lta,
    TxBody.addCredits(lid, amount, oracle),
  );
  console.log(`  Credits result: ${credResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Create ADI ─────────────────────────────────────────────────────────
  const timestamp = Date.now();
  const adiName = `sdk-js-adi-${timestamp}`;
  const adiUrl = `acc://${adiName}.acme`;
  const bookUrl = `${adiUrl}/book`;
  const pageUrl = `${bookUrl}/1`;

  console.log(`Step 3: Creating ADI "${adiUrl}"...`);
  const keyHash = kp.publicKeyHash();
  const createBody = TxBody.createIdentity(adiUrl, bookUrl, keyHash);
  const adiResult = await signer.signSubmitAndWait(lta, createBody);
  console.log(`  ADI creation: ${adiResult.success ? "SUCCESS" : "FAILED"}`);
  if (adiResult.txid) console.log(`  TxID: ${adiResult.txid}`);
  if (adiResult.error) console.log(`  Error: ${adiResult.error}`);
  console.log();

  // ── Add credits to key page ────────────────────────────────────────────
  console.log("Step 4: Adding credits to ADI key page...");
  const amount2 = calculateCreditsToAcme(50000, oracle);
  const credResult2 = await signer.signSubmitAndWait(
    lta,
    TxBody.addCredits(pageUrl, amount2, oracle),
  );
  console.log(`  Key page credits: ${credResult2.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Query ADI ──────────────────────────────────────────────────────────
  console.log("Step 5: Querying ADI...");
  await sleep(3000);
  try {
    const adiRes = await client.queryAccount(adiUrl);
    console.log(`  ADI URL: ${adiRes?.data?.url ?? adiUrl}`);
    console.log(`  ADI type: ${adiRes?.data?.type ?? adiRes?.type ?? "unknown"}`);
  } catch (e: any) {
    console.log(`  ADI query error: ${e.message}`);
  }

  try {
    const pageRes = await client.queryAccount(pageUrl);
    console.log(`  Key Page version: ${pageRes?.data?.version ?? "unknown"}`);
    console.log(`  Key Page credits: ${pageRes?.data?.creditBalance ?? "unknown"}`);
  } catch (e: any) {
    console.log(`  Key page query error: ${e.message}`);
  }

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 02 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
