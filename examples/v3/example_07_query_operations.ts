/**
 * Example 07: Query Operations
 *
 * Demonstrates:
 *   - Querying lite accounts
 *   - Querying ADI accounts
 *   - Querying directory entries
 *   - Querying network status
 *   - Querying oracle price
 *   - Various V2 and V3 query methods
 *
 * Aligned with:
 *   - Python: example_07_query_operations.py
 *   - Rust:   example_07_query_operations.rs
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
  console.log("║  Example 07: Query Operations                              ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const client = Accumulate.custom(V2_ENDPOINT, V3_ENDPOINT);

  // ── Setup: Create a lite account + ADI for querying ────────────────────
  const kp = Ed25519KeyPair.generate();
  const lid = kp.deriveLiteIdentityUrl();
  const lta = kp.deriveLiteTokenAccountUrl();

  console.log("Setting up test accounts...");
  await client.faucet(lta, 3, 500);
  await pollForBalance(client, lta);
  const oracle = await client.getOraclePrice();
  const liteSigner = new SmartSigner(client, kp.toKey(), lid);
  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.addCredits(lid, calculateCreditsToAcme(100000, oracle), oracle),
  );

  const ts = Date.now();
  const adiUrl = `acc://sdk-js-ex07-${ts}.acme`;
  const bookUrl = `${adiUrl}/book`;
  const pageUrl = `${bookUrl}/1`;
  await liteSigner.signSubmitAndWait(lta, TxBody.createIdentity(adiUrl, bookUrl, kp.publicKeyHash()));
  await liteSigner.signSubmitAndWait(lta, TxBody.addCredits(pageUrl, calculateCreditsToAcme(50000, oracle), oracle));
  console.log(`  Test ADI: ${adiUrl}`);
  // Wait for ADI and key page to propagate across BVNs
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    try {
      const v3r = await client.v3.query(pageUrl) as any;
      if ((v3r?.account?.creditBalance ?? 0) > 0) break;
    } catch { /* not indexed yet */ }
  }
  console.log();

  // ── Query 1: Network Status ────────────────────────────────────────────
  console.log("Query 1: Network Status (V3)...");
  try {
    const status = await client.v3.networkStatus();
    console.log(`  Oracle:     ${status?.oracle?.price ?? "unknown"}`);
    console.log(`  Bvn Count:  ${status?.network?.partitions?.length ?? "unknown"}`);
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }
  console.log();

  // ── Query 2: Oracle Price ──────────────────────────────────────────────
  console.log("Query 2: Oracle Price (V2)...");
  console.log(`  Price: ${oracle}`);
  console.log();

  // ── Query 3: Lite Token Account ────────────────────────────────────────
  console.log("Query 3: Lite Token Account...");
  try {
    const res = await client.queryAccount(lta);
    console.log(`  URL:     ${res?.data?.url ?? lta}`);
    console.log(`  Type:    ${res?.data?.type ?? res?.type ?? "unknown"}`);
    console.log(`  Balance: ${res?.data?.balance ?? res?.balance ?? "unknown"}`);
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }
  console.log();

  // ── Query 4: Lite Identity (credits) ───────────────────────────────────
  console.log("Query 4: Lite Identity...");
  try {
    const res = await client.queryAccount(lid);
    console.log(`  URL:     ${lid}`);
    console.log(`  Type:    ${res?.data?.type ?? res?.type ?? "unknown"}`);
    console.log(`  Credits: ${res?.data?.creditBalance ?? res?.creditBalance ?? "unknown"}`);
  } catch (e: any) {
    console.log(`  Error: ${e.message}`);
  }
  console.log();

  // ── Query 5: ADI (V3 for cross-BVN reliability) ───────────────────────
  console.log("Query 5: ADI...");
  await sleep(5000);
  try {
    const res = await client.v3.query(adiUrl) as any;
    console.log(`  URL:  ${adiUrl}`);
    console.log(`  Type: ${res?.account?.type ?? "unknown"}`);
  } catch {
    try {
      const res = await client.queryAccount(adiUrl);
      console.log(`  URL:  ${res?.data?.url ?? adiUrl}`);
      console.log(`  Type: ${res?.data?.type ?? res?.type ?? "unknown"}`);
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
    }
  }
  console.log();

  // ── Query 6: Key Page (V3 for cross-BVN reliability) ─────────────────
  console.log("Query 6: Key Page...");
  try {
    const v3Res = await client.v3.query(pageUrl) as any;
    const acct = v3Res?.account;
    console.log(`  URL:       ${pageUrl}`);
    console.log(`  Version:   ${acct?.version ?? "unknown"}`);
    console.log(`  Credits:   ${acct?.creditBalance ?? "unknown"}`);
    console.log(`  Threshold: ${acct?.acceptThreshold ?? acct?.threshold ?? "unknown"}`);
    console.log(`  Keys:      ${acct?.keys?.length ?? "unknown"}`);
  } catch {
    try {
      const res = await client.queryAccount(pageUrl);
      console.log(`  URL:       ${pageUrl}`);
      console.log(`  Version:   ${res?.data?.version ?? "unknown"}`);
      console.log(`  Credits:   ${res?.data?.creditBalance ?? "unknown"}`);
      console.log(`  Threshold: ${res?.data?.acceptThreshold ?? res?.data?.threshold ?? "unknown"}`);
      console.log(`  Keys:      ${res?.data?.keys?.length ?? "unknown"}`);
    } catch (e: any) {
      console.log(`  Error: ${e.message}`);
    }
  }
  console.log();

  // ── Query 7: Directory ─────────────────────────────────────────────────
  console.log("Query 7: Directory of ADI...");
  try {
    const res = await client.v2.queryDirectory(adiUrl, { start: 0, count: 10 });
    const items = res?.data?.entries ?? res?.items ?? [];
    console.log(`  Entries: ${items.length}`);
    for (const item of items) {
      console.log(`    - ${item}`);
    }
  } catch {
    // V2 directory query may not find ADI across BVNs
    console.log("  (ADI not yet visible on V2 endpoint)");
  }

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 07 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
