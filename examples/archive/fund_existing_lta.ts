/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { api_v3, URLArgs, TxID } from "accumulate.js";
import { MessageRecord, RpcError } from "accumulate.js/api_v3";
import { Transaction } from "accumulate.js/core";
import { Error as Error2, Status } from "accumulate.js/errors";

// Connect to Accumulate testnet
const client = new api_v3.JsonRpcClient("https://kermit.accumulatenetwork.io/v3");

const waitTime = 1000;
const waitLimit = 120000 / waitTime;

async function fundExistingLtaExample() {
    console.log("=== Fund Existing LTA Example ===\n");

    // Configuration - Update these values as needed
    const LTA_URL = "acc://f8f0c8a93e31eed62b0b07f50b61b6a8ee30b32ec1a85d28a12eb27b9936c0c4/ACME";
    const LID_URL = "acc://f8f0c8a93e31eed62b0b07f50b61b6a8ee30b32ec1a85d28a12eb27b9936c0c4";

    console.log("📋 Configuration:");
    console.log("─".repeat(60));
    console.log(`LTA URL:         ${LTA_URL}`);
    console.log(`LID URL:         ${LID_URL}`);
    console.log("─".repeat(60));
    console.log();

    // Step 1: Check initial balance
    console.log("Step 1: Checking initial LTA balance...");

    let initialBalance = 0;
    try {
        const initialQuery = await client.query(LTA_URL);
        initialBalance = (initialQuery as any).account.balance || 0;
        console.log(`💰 Initial LTA Balance: ${initialBalance} ACME tokens\n`);
    } catch (error) {
        console.log(`⚠️ Could not query initial balance: ${error}`);
        console.log("Continuing with funding...\n");
    }

    // Step 2: Fund LTA with 1000 ACME using 10 faucet calls
    console.log("Step 2: Funding LTA with 1000 ACME (10 faucet calls)...");

    let successfulFaucetCalls = 0;
    const targetFaucetCalls = 10;

    for (let i = 0; i < targetFaucetCalls; i++) {
        try {
            console.log(`💧 Faucet call ${i + 1}/${targetFaucetCalls}...`);
            const res = await client.faucet(LTA_URL);

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

    // Step 3: Check updated balance
    console.log("Step 3: Checking updated LTA balance...");

    let currentBalance = 0;
    let attempts = 0;
    const maxAttempts = 15;

    while (attempts < maxAttempts) {
        try {
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between checks
            const balanceQuery = await client.query(LTA_URL);
            currentBalance = (balanceQuery as any).account.balance || 0;

            console.log(`💰 Balance check ${attempts + 1}: ${currentBalance} ACME tokens`);

            if (currentBalance > initialBalance) {
                const addedTokens = currentBalance - initialBalance;
                console.log(`✅ Successfully added ${addedTokens} ACME tokens!`);
                console.log(`🎯 Current LTA Balance: ${currentBalance} ACME tokens\n`);
                break;
            }
        } catch (error) {
            console.log(`⏳ Balance query failed, retrying... (${attempts + 1}/${maxAttempts})`);
        }

        attempts++;

        if (attempts === maxAttempts) {
            console.log("⚠️ Warning: Could not confirm balance update after maximum attempts");
            console.log("Proceeding with credits purchase...\n");
        }
    }

    // Step 4: Wait for balance to settle
    console.log("Step 4: Waiting for balance to settle...");
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds for settlement
    console.log("✅ Balance settlement wait completed\n");

    // Step 5: Purchase 500,000 credits for the LID
    console.log("Step 5: Purchasing 500,000 credits for LID...");

    try {
        const { oracle } = await client.networkStatus();
        const targetCredits = 500000; // 500,000 credits
        const creditsAmount = ((targetCredits * 10 ** 2) / oracle!.price!) * 10 ** 8;

        console.log(`📈 Oracle price: ${oracle!.price!} credits per ACME`);
        console.log(`💳 Purchasing ${creditsAmount} ACME tokens for ${targetCredits} credits`);

        // Check if we have enough balance
        const finalBalanceQuery = await client.query(LTA_URL);
        const availableBalance = (finalBalanceQuery as any).account.balance || 0;

        if (availableBalance < creditsAmount) {
            console.log(`⚠️ Warning: Insufficient balance for credits purchase`);
            console.log(`Available: ${availableBalance} ACME, Required: ${creditsAmount} ACME`);
            console.log("Proceeding anyway - transaction may fail...");
        }

        const txn = new Transaction({
            header: {
                principal: LTA_URL,
            },
            body: {
                type: "addCredits",
                recipient: LID_URL,
                amount: creditsAmount,
                oracle: oracle!.price!,
            },
        });

        // Note: Since we don't have the private key, we cannot sign this transaction
        // This example shows the structure but would need the corresponding signer
        console.log(`🔍 Transaction prepared (would need signer to execute):`);
        console.log(`  Type: ${txn.body?.type}`);
        console.log(`  Principal: ${LTA_URL}`);
        console.log(`  Recipient: ${LID_URL}`);
        console.log(`  Amount: ${creditsAmount} ACME`);
        console.log(`  Oracle: ${oracle!.price!}`);

        console.log(`\n⚠️ Note: This example cannot complete the credits purchase without the private key`);
        console.log(`To complete this transaction, you would need to:`);
        console.log(`1. Import/create a signer with the private key for this LTA`);
        console.log(`2. Sign the transaction with: sig = await signer.sign(txn, { timestamp: Date.now() })`);
        console.log(`3. Submit with: await client.submit({ transaction: [txn], signatures: [sig] })`);

    } catch (error) {
        console.log(`❌ Credits purchase preparation failed: ${error}`);
    }

    // Step 6: Summary
    console.log("\n=== Funding Summary ===");
    console.log("📋 Results:");
    console.log("─".repeat(50));
    console.log(`LTA URL:               ${LTA_URL}`);
    console.log(`LID URL:               ${LID_URL}`);
    console.log(`Initial Balance:       ${initialBalance} ACME`);
    console.log(`Current Balance:       ${currentBalance} ACME`);
    console.log(`Tokens Added:          ${currentBalance - initialBalance} ACME`);
    console.log(`Successful Faucets:    ${successfulFaucetCalls}/${targetFaucetCalls} calls`);
    console.log("─".repeat(50));
    console.log("\n🎉 LTA funding completed!");
    console.log("💡 Note: Credits purchase requires the private key for this account");
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
fundExistingLtaExample().catch(console.error);