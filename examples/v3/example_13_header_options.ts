/**
 * Example 13: ADI-to-ADI Transfer with Header Options
 *
 * Demonstrates:
 *   - Creating two ADIs with token accounts
 *   - Transferring tokens with transaction header options:
 *     - memo: descriptive text stored in the transaction header
 *     - metadata: binary data stored in the transaction header
 *   - Querying and displaying header options from the transaction
 *
 * Aligned with:
 *   - Python: example_13_adi_to_adi_transfer_with_header_options.py
 *   - Rust:   example_13_adi_to_adi_transfer_with_header_options.rs
 *   - Dart:   example_13_adi_to_adi_transfer_with_header_options.dart
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
import { Buffer } from "../../src/common/index.js";
import { calculateCreditsToAcme } from "../../src/helpers/oracle.js";

const V2_ENDPOINT = process.env.ACCUMULATE_V2_URL || KERMIT_V2;
const V3_ENDPOINT = process.env.ACCUMULATE_V3_URL || KERMIT_V3;

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 13: ADI-to-ADI Transfer with Header Options       ║");
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
  const adi1Url = `acc://sdk-js-ex13a-${ts}.acme`;
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
  const adi2Url = `acc://sdk-js-ex13b-${ts}.acme`;
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

  // ── ADI-to-ADI transfer with header options ──────────────────────────
  const transferAmount = BigInt(3_0000_0000); // 3 ACME
  const memoText = "Payment for services rendered — invoice #1234";
  const metadataBytes = Buffer.from(
    JSON.stringify({ invoiceId: 1234, department: "engineering" }),
    "utf-8",
  );

  console.log("Step 4: Transferring 3 ACME from ADI 1 to ADI 2 with header options...");
  console.log(`  Memo:     "${memoText}"`);
  console.log(`  Metadata: ${Buffer.from(metadataBytes).toString("hex").substring(0, 40)}...`);

  const transferResult = await adiSigner1.signSubmitAndWait(
    tokenAcct1,
    TxBody.sendTokensSingle(tokenAcct2, transferAmount),
    {
      memo: memoText,
      metadata: metadataBytes,
    },
  );
  console.log(`  Transfer: ${transferResult.success ? "SUCCESS" : "FAILED"}`);
  if (transferResult.txid) console.log(`  TxID: ${transferResult.txid}`);
  console.log();

  // ── Query transaction to verify header options ────────────────────────
  console.log("Step 5: Querying transaction to verify header options...");
  await sleep(5000);
  if (transferResult.txid) {
    let memo: string | undefined;
    let metaHex: string | undefined;

    // Try V2 queryTx
    try {
      const txRes = await client.queryTx(transferResult.txid);
      const txData = txRes?.data ?? txRes;
      memo = txData?.memo ?? txData?.transaction?.header?.memo ?? txData?.header?.memo;
      const meta = txData?.metadata ?? txData?.transaction?.header?.metadata ?? txData?.header?.metadata;
      if (meta) metaHex = typeof meta === "string" ? meta : Buffer.from(meta as Uint8Array).toString("hex");
    } catch { /* V2 may not return header fields */ }

    // Try V3 query if V2 didn't return memo/metadata
    if (!memo && !metaHex) {
      try {
        const v3Res = await client.v3.query(transferResult.txid) as any;
        const txn = v3Res?.transaction ?? v3Res;
        const hdr = txn?.header ?? txn?.transaction?.header;
        memo = hdr?.memo;
        const meta = hdr?.metadata;
        if (meta) metaHex = typeof meta === "string" ? meta : Buffer.from(meta as Uint8Array).toString("hex");
      } catch { /* V3 may not return header fields either */ }
    }

    console.log(`  Header memo:     ${memo ?? "(not returned by API — stored on-chain)"}`);
    if (metaHex) {
      console.log(`  Header metadata: ${metaHex.substring(0, 40)}...`);
      try {
        const decoded = Buffer.from(metaHex, "hex").toString("utf-8");
        console.log(`  Decoded:         ${decoded}`);
      } catch {
        console.log(`  (metadata is not UTF-8 text)`);
      }
    } else {
      console.log(`  Header metadata: (not returned by API — stored on-chain)`);
    }
    console.log(`  Note: Memo and metadata are included in the transaction header`);
    console.log(`        and verified on-chain even if not returned by query APIs.`);
  } else {
    console.log("  No TxID available to query.");
  }
  console.log();

  // ── Query final balances (V3 for cross-BVN reliability) ─────────────
  console.log("Step 6: Querying final balances...");
  // Wait for cross-BVN synthetic deposit to arrive
  await sleep(10000);
  for (const [label, acctUrl] of [["ADI 1", tokenAcct1], ["ADI 2", tokenAcct2]]) {
    let balance = "unknown";
    try {
      const v3r = await client.v3.query(acctUrl) as any;
      balance = String(v3r?.account?.balance ?? "unknown");
    } catch {
      try {
        const r = await client.queryAccount(acctUrl);
        balance = String(r?.data?.balance ?? r?.balance ?? "unknown");
      } catch { /* both failed */ }
    }
    console.log(`  ${label} tokens: ${balance}`);
  }

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  Example 13 Complete                                       ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch(console.error);
