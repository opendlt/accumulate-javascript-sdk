/**
 * Example 04: Data Accounts & Entries
 *
 * Demonstrates:
 *   - Setting up an ADI
 *   - Creating a data account under the ADI
 *   - Writing data entries (text and hex)
 *   - Querying the data account and reading entries
 *
 * Aligned with:
 *   - Python: example_04_data_accounts.py
 *   - Rust:   example_04_data_accounts.rs
 *   - Dart:   example_04_data_accounts.dart
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
  console.log("║  Example 04: Data Accounts & Entries                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const client = Accumulate.custom(V2_ENDPOINT, V3_ENDPOINT);
  const kp = Ed25519KeyPair.generate();
  const lid = kp.deriveLiteIdentityUrl();
  const lta = kp.deriveLiteTokenAccountUrl();

  // ── Setup: Fund + Credits + ADI ────────────────────────────────────────
  console.log("Step 1: Setting up funded lite account and ADI...");
  await client.faucet(lta, 5, 500);
  await pollForBalance(client, lta);

  const oracle = await client.getOraclePrice();
  const liteSigner = new SmartSigner(client, kp.toKey(), lid);
  const amount = calculateCreditsToAcme(100000, oracle);
  await liteSigner.signSubmitAndWait(lta, TxBody.addCredits(lid, amount, oracle));

  const timestamp = Date.now();
  const adiUrl = `acc://sdk-js-ex04-${timestamp}.acme`;
  const bookUrl = `${adiUrl}/book`;
  const pageUrl = `${bookUrl}/1`;

  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.createIdentity(adiUrl, bookUrl, kp.publicKeyHash()),
  );

  const amount2 = calculateCreditsToAcme(50000, oracle);
  await liteSigner.signSubmitAndWait(lta, TxBody.addCredits(pageUrl, amount2, oracle));
  console.log(`  ADI created: ${adiUrl}`);
  // Wait for key page credits to propagate
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    try {
      const v3Res = await client.v3.query(pageUrl) as any;
      if ((v3Res?.account?.creditBalance ?? 0) > 0) break;
    } catch { /* not indexed yet */ }
  }
  console.log();

  // ── Create Data Account ────────────────────────────────────────────────
  const dataAcctUrl = `${adiUrl}/my-data`;
  console.log(`Step 2: Creating data account "${dataAcctUrl}"...`);
  const adiSigner = new SmartSigner(client, kp.toKey(), pageUrl);
  const createResult = await adiSigner.signSubmitAndWait(
    adiUrl,
    TxBody.createDataAccount(dataAcctUrl),
  );
  console.log(`  Data account creation: ${createResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Write text data entry ──────────────────────────────────────────────
  console.log("Step 3: Writing text data entry...");
  const writeResult1 = await adiSigner.signSubmitAndWait(
    dataAcctUrl,
    TxBody.writeData(["Hello from JavaScript SDK!", "Entry line 2"]),
  );
  console.log(`  Write text data: ${writeResult1.success ? "SUCCESS" : "FAILED"}`);
  if (writeResult1.error) console.log(`  Error: ${writeResult1.error}`);

  // ── Write hex data entry ───────────────────────────────────────────────
  console.log("Step 4: Writing hex data entry...");
  const writeResult2 = await adiSigner.signSubmitAndWait(
    dataAcctUrl,
    TxBody.writeDataHex(["deadbeef", "cafebabe"]),
  );
  console.log(`  Write hex data: ${writeResult2.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Query data account ─────────────────────────────────────────────────
  console.log("Step 5: Querying data account...");
  await sleep(3000);
  try {
    const res = await client.queryAccount(dataAcctUrl);
    console.log(`  Data account type: ${res?.data?.type ?? res?.type ?? "unknown"}`);
  } catch (e: any) {
    console.log(`  Query error: ${e.message}`);
  }

  // Query the latest data entry
  try {
    const dataRes = await client.v2.queryData(dataAcctUrl);
    console.log(`  Latest entry hash: ${dataRes?.entryHash ?? "unknown"}`);
    const entries = dataRes?.entry?.data ?? [];
    for (let i = 0; i < entries.length; i++) {
      console.log(`  Data[${i}]: ${entries[i]}`);
    }
  } catch (e: any) {
    console.log(`  Data query: ${e.message}`);
  }

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 04 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
