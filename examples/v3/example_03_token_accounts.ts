/**
 * Example 03: Token Accounts
 *
 * Demonstrates:
 *   - Setting up an ADI
 *   - Creating a token account under the ADI
 *   - Transferring tokens from a lite account to the ADI token account
 *   - Querying the token account balance
 *
 * Aligned with:
 *   - Python: example_03_token_accounts.py
 *   - Rust:   example_03_token_accounts.rs
 *   - Dart:   example_03_token_accounts.dart
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
  console.log("║  Example 03: Token Accounts                                ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
  console.log();

  const client = Accumulate.custom(V2_ENDPOINT, V3_ENDPOINT);
  const kp = Ed25519KeyPair.generate();
  const lid = kp.deriveLiteIdentityUrl();
  const lta = kp.deriveLiteTokenAccountUrl();

  // ── Setup: Fund + Credits ──────────────────────────────────────────────
  console.log("Step 1: Funding and adding credits...");
  await client.faucet(lta, 5, 500);
  await pollForBalance(client, lta);

  const oracle = await client.getOraclePrice();
  const liteSigner = new SmartSigner(client, kp.toKey(), lid);
  const amount = calculateCreditsToAcme(100000, oracle);
  await liteSigner.signSubmitAndWait(lta, TxBody.addCredits(lid, amount, oracle));
  console.log("  Lite account funded and credited.");
  console.log();

  // ── Create ADI ─────────────────────────────────────────────────────────
  const timestamp = Date.now();
  const adiUrl = `acc://sdk-js-ex03-${timestamp}.acme`;
  const bookUrl = `${adiUrl}/book`;
  const pageUrl = `${bookUrl}/1`;

  console.log(`Step 2: Creating ADI "${adiUrl}"...`);
  await liteSigner.signSubmitAndWait(
    lta,
    TxBody.createIdentity(adiUrl, bookUrl, kp.publicKeyHash()),
  );

  // Credit the ADI key page
  const amount2 = calculateCreditsToAcme(50000, oracle);
  await liteSigner.signSubmitAndWait(lta, TxBody.addCredits(pageUrl, amount2, oracle));
  console.log("  ADI created and key page credited.");
  console.log("  Waiting for network propagation...");
  // Wait for key page credits to appear (poll up to 60s)
  let pageCredits = 0;
  for (let i = 0; i < 12; i++) {
    await sleep(5000);
    try {
      const v3Res = await client.v3.query(pageUrl) as any;
      pageCredits = v3Res?.account?.creditBalance ?? 0;
      if (pageCredits > 0) break;
    } catch { /* not indexed yet */ }
  }
  console.log(`  Key page credits: ${pageCredits}`);
  console.log();

  // ── Create Token Account ───────────────────────────────────────────────
  const tokenAcctUrl = `${adiUrl}/tokens`;
  console.log(`Step 3: Creating token account "${tokenAcctUrl}"...`);
  const adiSigner = new SmartSigner(client, kp.toKey(), pageUrl);
  const createResult = await adiSigner.signSubmitAndWait(
    adiUrl,
    TxBody.createTokenAccount(tokenAcctUrl),
  );
  console.log(`  Token account creation: ${createResult.success ? "SUCCESS" : "FAILED"}`);
  if (createResult.error) console.log(`  Error: ${createResult.error}`);
  console.log();

  // ── Transfer tokens ────────────────────────────────────────────────────
  const transferAmount = BigInt(5_0000_0000); // 5 ACME
  console.log(`Step 4: Transferring ${transferAmount} units to ADI token account...`);
  const sendResult = await liteSigner.signSubmitAndWait(
    lta,
    TxBody.sendTokensSingle(tokenAcctUrl, transferAmount),
  );
  console.log(`  Transfer: ${sendResult.success ? "SUCCESS" : "FAILED"}`);
  console.log();

  // ── Query balance ──────────────────────────────────────────────────────
  console.log("Step 5: Querying token account balance...");
  await sleep(5000);
  let balance: string | number = "unknown";
  try {
    const v3Res = await client.v3.query(tokenAcctUrl) as any;
    balance = v3Res?.account?.balance ?? "unknown";
  } catch { /* fall through to V2 */ }
  if (balance === "unknown") {
    try {
      const res = await client.queryAccount(tokenAcctUrl);
      balance = res?.data?.balance ?? res?.balance ?? "unknown";
    } catch { /* ignore */ }
  }
  console.log(`  Balance: ${balance}`);

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 03 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
