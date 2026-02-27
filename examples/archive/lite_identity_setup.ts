/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { api_v3, ED25519Key, Signer, TxID, URLArgs } from "accumulate.js";
import { MessageRecord, RpcError } from "accumulate.js/api_v3";
import { Transaction } from "accumulate.js/core";
import { Error as Error2, Status } from "accumulate.js/errors";

// Connect to Accumulate testnet
const client = new api_v3.JsonRpcClient("https://kermit.accumulatenetwork.io/v3");

const waitTime = 1000;
const waitLimit = 120000 / waitTime;

async function liteIdentitySetupExample() {
    console.log("=== Lite Identity Setup Example ===\n");

    // Step 1: Create Lite Identity and Token Account
    console.log("Step 1: Creating Lite Identity and Token Account...\n");

    const key = ED25519Key.generate();
    const lid = Signer.forLite(key);
    const lta = lid.url.join("ACME");

    // Format and display key information
    console.log("🔐 Key Information:");
    console.log("─".repeat(60));
    console.log(`Public Key:      ${Buffer.from(key.address.publicKey).toString('hex')}`);
    console.log(`Private Key:     ${Buffer.from(key.address.privateKey).toString('hex')}`);
    console.log(`Public Key Hash: ${Buffer.from(key.address.publicKeyHash).toString('hex')}`);
    console.log(`LID URL:         ${lid.url.toString()}`);
    console.log(`LTA URL:         ${lta.toString()}`);
    console.log("─".repeat(60));
    console.log();

    // Step 2: Fund LTA with 2000 ACME using 20 faucet calls
    console.log("Step 2: Funding LTA with 2000 ACME (20 faucet calls)...");

    let successfulFaucetCalls = 0;
    const targetFaucetCalls = 20;

    for (let i = 0; i < targetFaucetCalls; i++) {
        try {
            console.log(`💧 Faucet call ${i + 1}/${targetFaucetCalls}...`);
            const res = await client.faucet(lta);

            if (res.status && res.status.txID) {
                await waitForSingle(res.status.txID);
                successfulFaucetCalls++;
                console.log(`✅ Faucet call ${i + 1} completed successfully`);
            }

            // Small delay between faucet calls to be respectful to the testnet
            if (i < targetFaucetCalls - 1) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.log(`❌ Faucet call ${i + 1} failed: ${error}`);
            // Continue with remaining calls even if one fails
        }
    }

    console.log(`\n📊 Faucet Summary: ${successfulFaucetCalls}/${targetFaucetCalls} calls successful\n`);

    // Step 3: Wait for account creation and check balance
    console.log("Step 3: Waiting for account creation and checking balance...");

    let balanceQuery: any;
    let attempts = 0;
    const maxAttempts = 20;

    while (attempts < maxAttempts) {
        try {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between checks
            balanceQuery = await client.query(lta);
            const balance = (balanceQuery as any).account.balance || 0;

            console.log(`💰 Balance check ${attempts + 1}: ${balance} ACME tokens`);

            if (balance > 0) {
                console.log(`✅ Account funded successfully with ${balance} ACME tokens\n`);
                break;
            }
        } catch (error) {
            console.log(`⏳ Account not yet available, retrying... (${attempts + 1}/${maxAttempts})`);
        }

        attempts++;

        if (attempts === maxAttempts) {
            throw new Error("Account creation timed out after maximum attempts");
        }
    }

    const finalBalance = (balanceQuery as any).account.balance;
    console.log(`🎯 Final LTA Balance: ${finalBalance} ACME tokens\n`);

    // Step 4: Wait for balance to settle
    console.log("Step 4: Waiting for balance to settle...");
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds for settlement
    console.log("✅ Balance settlement wait completed\n");

    // Step 5: Purchase 500,000 credits
    console.log("Step 5: Purchasing 500,000 credits for LID...");

    const { oracle } = await client.networkStatus();
    const targetCredits = 500000; // 500,000 credits
    const creditsAmount = ((targetCredits * 10 ** 2) / oracle!.price!) * 10 ** 8;

    console.log(`📈 Oracle price: ${oracle!.price!} credits per ACME`);
    console.log(`💳 Purchasing ${creditsAmount} ACME tokens for ${targetCredits} credits`);

    const txn = new Transaction({
        header: {
            principal: lta,
        },
        body: {
            type: "addCredits",
            recipient: lid.url,
            amount: creditsAmount,
            oracle: oracle!.price!,
        },
    });

    const sig = await lid.sign(txn, { timestamp: Date.now() });
    const submitRes = await client.submit({ transaction: [txn], signatures: [sig] });

    for (const r of submitRes) {
        if (!r.success) {
            throw new Error(`Credits purchase failed: ${r.message}`);
        }
        if (!r.status?.txID) {
            throw new Error("Credits purchase failed: missing transaction ID");
        }
        await waitForSingle(r.status.txID);
    }

    // Verify credits were added
    const creditsQuery = await client.query(lid.url);
    const finalCredits = (creditsQuery as any).account?.creditBalance || 0;

    console.log(`✅ Credits purchase completed successfully!`);
    console.log(`💎 Final LID Credits: ${finalCredits} credits\n`);

    // Step 6: Final summary
    console.log("=== Setup Complete! ===");
    console.log("📋 Summary:");
    console.log("─".repeat(50));
    console.log(`LID URL:          ${lid.url.toString()}`);
    console.log(`LTA URL:          ${lta.toString()}`);
    console.log(`ACME Balance:     ${finalBalance} tokens`);
    console.log(`Credits Balance:  ${finalCredits} credits`);
    console.log(`Faucet Success:   ${successfulFaucetCalls}/${targetFaucetCalls} calls`);
    console.log("─".repeat(50));
    console.log("\n🎉 Lite Identity setup completed successfully!");
}

async function waitForSingle(txid: TxID | URLArgs) {
    console.log(`⏳ Waiting for transaction ${txid}...`);

    for (let i = 0; i < waitLimit; i++) {
        try {
            const r = (await client.query(txid)) as MessageRecord;
            const status = r.status;

            if (status && (status === Status.Delivered || (status as any) === 201 || (status as any).code === "delivered")) {
                console.log(`✅ Transaction completed successfully`);
                return r;
            }

            // Only log every 10th attempt to reduce noise
            if (i % 10 === 0) {
                console.log(`⏳ Still waiting... (attempt ${i + 1}/${waitLimit})`);
            }

            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue;
        } catch (error) {
            const err2 = isClientError(error);
            if (err2.code === Status.NotFound) {
                // Transaction not found yet, continue waiting
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }
            throw new Error(`Transaction failed: ${err2.message}`);
        }
    }

    throw new Error(`Transaction still pending after ${(waitTime * waitLimit) / 1000} seconds`);
}

function isClientError(error: any) {
    if (!(error instanceof RpcError)) throw error;
    if (error.code > -33000) throw error;

    let err2;
    try {
        err2 = new Error2(error.data);
    } catch (_) {
        throw error;
    }
    if (err2.code && err2.code >= 500) {
        throw err2;
    }
    return err2;
}

// Run the example
liteIdentitySetupExample().catch(console.error);