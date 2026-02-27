/**
 * Example 09: Key Management
 *
 * Demonstrates:
 *   - Creating an ADI with a key page
 *   - Adding a second key to the key page
 *   - Querying key page state
 *   - Removing a key from the key page
 *   - Verifying key page changes
 *
 * Aligned with:
 *   - Python: example_09_key_management.py
 *   - Rust:   example_09_key_management.rs
 *   - Dart:   example_09_key_management.dart
 */

import {
  Accumulate,
  Ed25519KeyPair,
  SmartSigner,
  TxBody,
  KeyManager,
  pollForBalance,
  KERMIT_V2,
  KERMIT_V3,
} from "../../src/index.js";
import { calculateCreditsToAcme } from "../../src/helpers/oracle.js";

const V2_ENDPOINT = process.env.ACCUMULATE_V2_URL || KERMIT_V2;
const V3_ENDPOINT = process.env.ACCUMULATE_V3_URL || KERMIT_V3;

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 09: Key Management                                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const client = Accumulate.custom(V2_ENDPOINT, V3_ENDPOINT);
  const oracle = await client.getOraclePrice();

  // ── Setup: Create funded ADI ───────────────────────────────────────────
  const kp1 = Ed25519KeyPair.generate();
  const lid = kp1.deriveLiteIdentityUrl();
  const lta = kp1.deriveLiteTokenAccountUrl();

  console.log("Step 1: Setting up funded lite account and ADI...");
  await client.faucet(lta, 5, 500);
  await pollForBalance(client, lta);

  const liteSigner = new SmartSigner(client, kp1.toKey(), lid);
  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.addCredits(lid, calculateCreditsToAcme(100000, oracle), oracle),
  );

  const ts = Date.now();
  const adiUrl = `acc://sdk-js-ex09-${ts}.acme`;
  const bookUrl = `${adiUrl}/book`;
  const pageUrl = `${bookUrl}/1`;

  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.createIdentity(adiUrl, bookUrl, kp1.publicKeyHash()),
  );
  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.addCredits(pageUrl, calculateCreditsToAcme(50000, oracle), oracle),
  );
  console.log(`  ADI: ${adiUrl}`);
  console.log(`  Key Page: ${pageUrl}`);
  // Wait for key page credits to propagate across BVNs
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    try {
      const v3r = await client.v3.query(pageUrl) as any;
      if ((v3r?.account?.creditBalance ?? 0) > 0) break;
    } catch { /* not indexed yet */ }
  }
  console.log();

  // ── Query initial key page state ───────────────────────────────────────
  const km = new KeyManager(client, pageUrl);
  console.log("Step 2: Querying initial key page state...");
  await sleep(3000);
  let state = await km.getKeyPageState();
  console.log(`  Version:   ${state.version}`);
  console.log(`  Threshold: ${state.acceptThreshold}`);
  console.log(`  Keys:      ${state.keys.length}`);
  for (const k of state.keys) {
    console.log(`    - ${k.keyHash.substring(0, 16)}...`);
  }
  console.log();

  // ── Add a second key ───────────────────────────────────────────────────
  const kp2 = Ed25519KeyPair.generate();
  const kp2Hash = kp2.publicKeyHash();

  console.log("Step 3: Adding a second key to the key page...");
  const addResult = await km.addKey(kp1.toKey(), kp2Hash);
  console.log(`  Add key result: ${addResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Query updated state ────────────────────────────────────────────────
  console.log("Step 4: Querying updated key page state...");
  await sleep(3000);
  state = await km.getKeyPageState();
  console.log(`  Version:   ${state.version}`);
  console.log(`  Threshold: ${state.acceptThreshold}`);
  console.log(`  Keys:      ${state.keys.length}`);
  for (const k of state.keys) {
    console.log(`    - ${k.keyHash.substring(0, 16)}...`);
  }
  console.log();

  // ── Remove the second key ──────────────────────────────────────────────
  console.log("Step 5: Removing the second key...");
  const removeResult = await km.removeKey(kp1.toKey(), kp2Hash);
  console.log(`  Remove key result: ${removeResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Verify final state ─────────────────────────────────────────────────
  console.log("Step 6: Verifying final key page state...");
  await sleep(3000);
  state = await km.getKeyPageState();
  console.log(`  Version:   ${state.version}`);
  console.log(`  Keys:      ${state.keys.length}`);
  for (const k of state.keys) {
    console.log(`    - ${k.keyHash.substring(0, 16)}...`);
  }

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 09 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
