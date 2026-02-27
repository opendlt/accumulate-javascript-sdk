/**
 * Example 05: ADI-to-ADI Token Transfer
 *
 * Demonstrates:
 *   - Creating two ADIs with token accounts
 *   - Funding both
 *   - Transferring tokens between ADI token accounts
 *   - Querying balances
 *
 * Aligned with:
 *   - Python: example_05_adi_to_adi_transfer.py
 *   - Rust:   example_05_adi_to_adi_transfer.rs
 *   - Dart:   example_05_adi_to_adi_transfer.dart
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
  console.log("║  Example 05: ADI-to-ADI Token Transfer                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const client = Accumulate.custom(V2_ENDPOINT, V3_ENDPOINT);
  const oracle = await client.getOraclePrice();

  // ── Setup two wallets ──────────────────────────────────────────────────
  const kp1 = Ed25519KeyPair.generate();
  const kp2 = Ed25519KeyPair.generate();
  const lid1 = kp1.deriveLiteIdentityUrl();
  const lta1 = kp1.deriveLiteTokenAccountUrl();
  const lid2 = kp2.deriveLiteIdentityUrl();
  const lta2 = kp2.deriveLiteTokenAccountUrl();

  console.log("Step 1: Funding two lite accounts...");
  await client.faucet(lta1, 5, 500);
  await client.faucet(lta2, 5, 500);
  await pollForBalance(client, lta1);
  await pollForBalance(client, lta2);

  // Add credits to both
  const signer1 = new SmartSigner(client, kp1.toKey(), lid1);
  const signer2 = new SmartSigner(client, kp2.toKey(), lid2);
  const credAmt = calculateCreditsToAcme(100000, oracle);
  await signer1.signSubmitAndWait(lta1, TxBody.addCredits(lid1, credAmt, oracle));
  await signer2.signSubmitAndWait(lta2, TxBody.addCredits(lid2, credAmt, oracle));
  console.log("  Both lite accounts funded and credited.");
  console.log();

  // ── Create ADI 1 ──────────────────────────────────────────────────────
  const ts = Date.now();
  const adi1Url = `acc://sdk-js-ex05a-${ts}.acme`;
  const book1 = `${adi1Url}/book`;
  const page1 = `${book1}/1`;

  console.log(`Step 2: Creating ADI 1: ${adi1Url}`);
  await signer1.signSubmitAndWait(lta1, TxBody.createIdentity(adi1Url, book1, kp1.publicKeyHash()));
  await signer1.signSubmitAndWait(lta1, TxBody.addCredits(page1, calculateCreditsToAcme(50000, oracle), oracle));
  // Wait for key page credits to propagate
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    try {
      const v3r = await client.v3.query(page1) as any;
      if ((v3r?.account?.creditBalance ?? 0) > 0) break;
    } catch { /* not indexed yet */ }
  }

  const tokenAcct1 = `${adi1Url}/tokens`;
  const adiSigner1 = new SmartSigner(client, kp1.toKey(), page1);
  await adiSigner1.signSubmitAndWait(adi1Url, TxBody.createTokenAccount(tokenAcct1));
  console.log(`  Token account 1: ${tokenAcct1}`);

  // Fund ADI token account from lite
  await signer1.signSubmitAndWait(lta1, TxBody.sendTokensSingle(tokenAcct1, BigInt(10_0000_0000)));
  console.log("  ADI 1 token account funded with 10 ACME.");
  console.log();

  // ── Create ADI 2 ──────────────────────────────────────────────────────
  const adi2Url = `acc://sdk-js-ex05b-${ts}.acme`;
  const book2 = `${adi2Url}/book`;
  const page2 = `${book2}/1`;

  console.log(`Step 3: Creating ADI 2: ${adi2Url}`);
  await signer2.signSubmitAndWait(lta2, TxBody.createIdentity(adi2Url, book2, kp2.publicKeyHash()));
  await signer2.signSubmitAndWait(lta2, TxBody.addCredits(page2, calculateCreditsToAcme(50000, oracle), oracle));
  // Wait for key page credits to propagate
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    try {
      const v3r = await client.v3.query(page2) as any;
      if ((v3r?.account?.creditBalance ?? 0) > 0) break;
    } catch { /* not indexed yet */ }
  }

  const tokenAcct2 = `${adi2Url}/tokens`;
  const adiSigner2 = new SmartSigner(client, kp2.toKey(), page2);
  await adiSigner2.signSubmitAndWait(adi2Url, TxBody.createTokenAccount(tokenAcct2));
  console.log(`  Token account 2: ${tokenAcct2}`);
  console.log();

  // ── ADI-to-ADI transfer ────────────────────────────────────────────────
  const transferAmount = BigInt(3_0000_0000); // 3 ACME
  console.log(`Step 4: Transferring 3 ACME from ADI 1 to ADI 2...`);
  const transferResult = await adiSigner1.signSubmitAndWait(
    tokenAcct1,
    TxBody.sendTokensSingle(tokenAcct2, transferAmount),
  );
  console.log(`  Transfer: ${transferResult.success ? "SUCCESS" : "FAILED"}`);
  if (transferResult.txid) console.log(`  TxID: ${transferResult.txid}`);
  console.log();

  // ── Query final balances ───────────────────────────────────────────────
  console.log("Step 5: Querying final balances...");
  await sleep(3000);
  try {
    const r1 = await client.queryAccount(tokenAcct1);
    console.log(`  ADI 1 tokens: ${r1?.data?.balance ?? r1?.balance ?? "unknown"}`);
  } catch (e: any) { console.log(`  ADI 1 query: ${e.message}`); }
  try {
    const r2 = await client.queryAccount(tokenAcct2);
    console.log(`  ADI 2 tokens: ${r2?.data?.balance ?? r2?.balance ?? "unknown"}`);
  } catch (e: any) { console.log(`  ADI 2 query: ${e.message}`); }

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 05 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
