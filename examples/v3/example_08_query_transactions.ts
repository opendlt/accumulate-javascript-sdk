/**
 * Example 08: Query Transactions & Signatures
 *
 * Demonstrates:
 *   - Submitting a transaction
 *   - Querying the transaction by ID
 *   - Querying transaction signatures
 *   - Inspecting memo and metadata from headers
 *
 * Aligned with:
 *   - Python: example_08_query_transactions.py
 *   - Rust:   example_08_query_transactions.rs
 *   - Dart:   example_08_query_transactions.dart
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
  console.log("║  Example 08: Query Transactions & Signatures               ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const client = Accumulate.custom(V2_ENDPOINT, V3_ENDPOINT);
  const kp = Ed25519KeyPair.generate();
  const lid = kp.deriveLiteIdentityUrl();
  const lta = kp.deriveLiteTokenAccountUrl();

  // ── Setup ──────────────────────────────────────────────────────────────
  console.log("Step 1: Setting up account...");
  await client.faucet(lta, 5, 500);
  await pollForBalance(client, lta);
  const oracle = await client.getOraclePrice();
  const signer = new SmartSigner(client, kp.toKey(), lid);
  await signer.signSubmitAndWait(
    lta,
    TxBody.addCredits(lid, calculateCreditsToAcme(100000, oracle), oracle),
  );
  console.log("  Account funded and credited.");
  console.log();

  // ── Submit a transaction with memo ─────────────────────────────────────
  const kp2 = Ed25519KeyPair.generate();
  const lta2 = kp2.deriveLiteTokenAccountUrl();

  console.log("Step 2: Submitting a send-tokens transaction with memo...");
  const sendBody = TxBody.sendTokensSingle(lta2, BigInt(1_0000_0000));
  const result = await signer.signSubmitAndWait(lta, sendBody, {
    memo: "Payment for services rendered",
    metadata: Buffer.from("custom-metadata-001"),
  });
  console.log(`  Submit: ${result.success ? "SUCCESS" : "FAILED"}`);
  console.log(`  TxID: ${result.txid}`);
  console.log();

  // ── Query transaction by ID ────────────────────────────────────────────
  if (result.txid) {
    console.log("Step 3: Querying transaction by ID...");
    await sleep(3000);
    try {
      const txRes = await client.queryTx(result.txid);
      console.log(`  Status:  ${txRes?.status?.code ?? "unknown"}`);
      console.log(`  Type:    ${txRes?.data?.type ?? txRes?.type ?? "unknown"}`);
      console.log(`  Memo:    ${txRes?.data?.header?.memo ?? txRes?.transaction?.header?.memo ?? "none"}`);

      // Signatures
      const sigs = txRes?.signatures ?? txRes?.data?.signatures ?? [];
      console.log(`  Signatures: ${sigs.length}`);
      for (let i = 0; i < sigs.length; i++) {
        const sig = sigs[i];
        console.log(`    Sig[${i}]: type=${sig?.type ?? "unknown"}, signer=${sig?.signer ?? "unknown"}`);
      }
    } catch (e: any) {
      console.log(`  Query error: ${e.message}`);
    }
  }

  // ── Query transaction history ──────────────────────────────────────────
  console.log();
  console.log("Step 4: Querying transaction history for LTA...");
  try {
    const histRes = await client.v2.queryTxHistory(lta, { start: 0, count: 5 });
    const items = histRes?.items ?? [];
    console.log(`  Transaction count: ${items.length}`);
    for (let i = 0; i < Math.min(items.length, 3); i++) {
      const item = items[i];
      console.log(`    [${i}] type=${item?.data?.type ?? item?.type ?? "unknown"}, status=${item?.status?.code ?? "unknown"}`);
    }
  } catch (e: any) {
    console.log(`  History query error: ${e.message}`);
  }

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 08 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
