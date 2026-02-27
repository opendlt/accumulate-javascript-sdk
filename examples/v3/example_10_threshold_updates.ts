/**
 * Example 10: Threshold Updates (Multi-Sig)
 *
 * Demonstrates:
 *   - Setting up an ADI with two keys on the key page
 *   - Setting threshold to 2-of-2 (both keys must sign)
 *   - Demonstrating multi-sig (both keys must sign a transaction)
 *   - Resetting threshold to 1-of-2
 *
 * Aligned with:
 *   - Python: example_10_threshold_updates.py
 *   - Rust:   example_10_threshold_updates.rs
 *   - Dart:   example_10_threshold_updates.dart
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
import { Envelope } from "../../src/messaging/index.js";
import { calculateCreditsToAcme } from "../../src/helpers/oracle.js";

const V2_ENDPOINT = process.env.ACCUMULATE_V2_URL || KERMIT_V2;
const V3_ENDPOINT = process.env.ACCUMULATE_V3_URL || KERMIT_V3;

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 10: Threshold Updates                             ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const client = Accumulate.custom(V2_ENDPOINT, V3_ENDPOINT);
  const oracle = await client.getOraclePrice();

  // ── Setup: funded ADI with two keys ────────────────────────────────────
  const kp1 = Ed25519KeyPair.generate();
  const kp2 = Ed25519KeyPair.generate();
  const lid = kp1.deriveLiteIdentityUrl();
  const lta = kp1.deriveLiteTokenAccountUrl();

  console.log("Step 1: Creating funded ADI with two keys...");
  await client.faucet(lta, 5, 500);
  await pollForBalance(client, lta);

  const liteSigner = new SmartSigner(client, kp1.toKey(), lid);
  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.addCredits(lid, calculateCreditsToAcme(100000, oracle), oracle),
  );

  const ts = Date.now();
  const adiUrl = `acc://sdk-js-ex10-${ts}.acme`;
  const bookUrl = `${adiUrl}/book`;
  const pageUrl = `${bookUrl}/1`;

  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.createIdentity(adiUrl, bookUrl, kp1.publicKeyHash()),
  );
  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.addCredits(pageUrl, calculateCreditsToAcme(100000, oracle), oracle),
  );
  // Wait for key page credits to propagate
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    try {
      const v3r = await client.v3.query(pageUrl) as any;
      if ((v3r?.account?.creditBalance ?? 0) > 0) break;
    } catch { /* not indexed yet */ }
  }

  // Add second key to key page
  const adiSigner1 = new SmartSigner(client, kp1.toKey(), pageUrl);
  await adiSigner1.addKey(kp2.publicKeyHash());
  console.log(`  ADI: ${adiUrl}`);
  console.log(`  Key 1: ${kp1.publicKeyHashHex().substring(0, 16)}...`);
  console.log(`  Key 2: ${kp2.publicKeyHashHex().substring(0, 16)}...`);
  console.log();

  // ── Verify two keys ────────────────────────────────────────────────────
  const km = new KeyManager(client, pageUrl);
  await sleep(3000);
  let state = await km.getKeyPageState();
  console.log("Step 2: Current key page state:");
  console.log(`  Keys:      ${state.keys.length}`);
  console.log(`  Threshold: ${state.acceptThreshold}`);
  console.log();

  // ── Set threshold to 2-of-2 ────────────────────────────────────────────
  console.log("Step 3: Setting threshold to 2 (both keys must sign)...");
  const threshResult = await km.setThreshold(kp1.toKey(), 2);
  console.log(`  Set threshold: ${threshResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Verify threshold ───────────────────────────────────────────────────
  await sleep(3000);
  state = await km.getKeyPageState();
  console.log("Step 4: Updated key page state:");
  console.log(`  Threshold: ${state.acceptThreshold}`);
  console.log(`  Version:   ${state.version}`);
  console.log();

  // ── Reset threshold to 1-of-2 (requires multi-sig: both keys) ────────
  console.log("Step 5: Resetting threshold to 1 (multi-sig with both keys)...");
  // With threshold=2, both keys must sign.
  // Build the transaction body, sign with kp1, then add kp2's signature.
  const resetBody = TxBody.updateKeyPageSetThreshold(1);

  // Sign with kp1 first (sets the initiator)
  const signer1 = new SmartSigner(client, kp1.toKey(), pageUrl);
  const { transaction: txn, envelope: env1 } = await signer1.sign(pageUrl, resetBody);

  // Sign the same transaction with kp2
  const sig2 = await kp2.toKey().sign(txn, {
    signer: pageUrl,
    signerVersion: signer1.version!,
    timestamp: Date.now() * 1000,
  });

  // Create envelope with both signatures
  const multiSigEnvelope = new Envelope({
    transaction: [txn],
    signatures: [...(env1.signatures ?? []), sig2],
  });

  // Submit via V2 and poll for delivery
  let resetResult = { success: false, txid: "", error: "" };
  try {
    const response = await client.v2.execute(multiSigEnvelope);
    const txid = String(response?.txid ?? "");
    resetResult = { success: true, txid, error: "" };

    // Poll for delivery
    for (let i = 0; i < 30; i++) {
      await sleep(2000);
      try {
        const txRes = await client.queryTx(txid);
        if (txRes?.status?.code === "delivered") break;
      } catch {
        // V3 fallback
        try {
          const v3Res = await client.v3.query(txid) as any;
          if (v3Res?.status?.code === 201 || v3Res?.status?.delivered) break;
        } catch { /* keep polling */ }
      }
    }
  } catch (e: any) {
    resetResult = { success: false, txid: "", error: e.message };
  }
  console.log(`  Reset threshold: ${resetResult.success ? "SUCCESS" : "FAILED"}`);
  if (resetResult.error) console.log(`  Error: ${resetResult.error}`);

  // ── Final state ────────────────────────────────────────────────────────
  await sleep(3000);
  state = await km.getKeyPageState();
  console.log();
  console.log("Step 6: Final key page state:");
  console.log(`  Threshold: ${state.acceptThreshold}`);
  console.log(`  Version:   ${state.version}`);
  console.log(`  Keys:      ${state.keys.length}`);

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 10 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
