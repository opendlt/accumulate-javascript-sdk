import { api_v3, ED25519Key, Signer } from "accumulate.js";
import { Transaction } from "accumulate.js/core";
import { Envelope } from "accumulate.js/messaging";

// Connect to Accumulate testnet
const client = new api_v3.JsonRpcClient("https://kermit.accumulatenetwork.io/v3");

async function createKeyPageExample() {
  console.log("=== Create Key Page API v3 Example ===\n");

  // Configuration from user
  const keyBookUrl = "acc://key-mgmt-adi-1762707857890.acme/book";
  const newKeyHash = "db3131e6447c5b6db54a3dd35d1640ca137b3414170d246c920cfa12fe1b5e54";

  // Private key (first 64 characters only as requested)
  const privKeyHex = "833224d93dde732803e77a52d51a1ba5aa0d5f53c105772fe2e42d8b94ff151e";
  const publicKeyHex = "2f07a1a5681a8149d38c8fd08b8470dfc9ad87c8bb541ddd74342d088b29fcb7";

  console.log(`Key Book URL: ${keyBookUrl}`);
  console.log(`New Key Hash: ${newKeyHash}`);
  console.log(`Using Private Key: ${privKeyHex}...`);
  console.log(`Public Key: ${publicKeyHex}\n`);

  try {
    // Step 1: Create the signing key from the provided private key
    console.log("Step 1: Setting up signer...");
    const signingKey = ED25519Key.from(Buffer.from(privKeyHex, "hex"));

    // Determine key page URL - typically /book/1 for the first page
    const keyPageUrl = keyBookUrl + "/1";
    console.log(`Key Page URL: ${keyPageUrl}`);

    // Create signer for the key page with version 1 (adjust if needed)
    const signer = Signer.forPage(keyPageUrl, signingKey).withVersion(1);
    console.log(`Signer URL: ${signer.url} v${signer.version}\n`);

    // Step 2: Build the CreateKeyPage transaction
    console.log("Step 2: Building CreateKeyPage transaction...");
    const transaction = new Transaction({
      header: {
        principal: keyBookUrl, // The key book is the principal
      },
      body: {
        type: "createKeyPage",
        keys: [{
          keyHash: newKeyHash, // The new key hash to add to the page
        }],
      },
    });

    console.log("Transaction created:");
    console.log(JSON.stringify(transaction.asObject(), null, 2));

    // Step 3: Sign the transaction
    console.log("\nStep 3: Signing transaction...");
    // Use current time in microseconds (Date.now() * 1000)
    const networkTimestamp = Date.now() * 1000;
    console.log(`Using current timestamp in microseconds: ${networkTimestamp}`);
    const signature = await signer.sign(transaction, { timestamp: networkTimestamp });
    console.log("Transaction signed successfully");

    // Step 4: Build the envelope
    console.log("\nStep 4: Building envelope...");
    const envelope = new Envelope({
      transaction: [transaction],
      signatures: [signature],
    });

    console.log("Envelope created:");
    console.log(JSON.stringify(envelope.asObject(), null, 2));

    // Step 5: Submit the envelope using API v3
    console.log("\nStep 5: Submitting envelope to network...");
    const submissions = await client.submit(envelope.asObject());

    console.log("Submission results:");
    for (const submission of submissions) {
      console.log(`- Success: ${submission.success}`);
      console.log(`- Message: ${submission.message || 'N/A'}`);
      if (submission.status && submission.status.txID) {
        console.log(`- Transaction ID: ${submission.status.txID}`);
      }
      if (!submission.success) {
        console.error(`❌ Submission failed: ${submission.message}`);
        return;
      }
    }

    console.log("\n✅ CreateKeyPage transaction submitted successfully!");

    // Step 6: Wait for transaction completion (optional)
    console.log("\nStep 6: Waiting for transaction completion...");
    if (submissions[0].status && submissions[0].status.txID) {
      await waitForTransaction(submissions[0].status.txID);
      console.log("✅ Transaction completed successfully!");
    }

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

// Helper function to wait for transaction completion
async function waitForTransaction(txid: any, maxWaitTime = 120000) {
  const waitInterval = 2000; // 2 seconds
  const maxAttempts = maxWaitTime / waitInterval;

  console.log(`Waiting for transaction ${txid}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await client.query(txid);
      const status = (result as any).status;

      if (status === "delivered" || status === 201 || (status && status.code === "delivered")) {
        console.log(`✅ Transaction delivered after ${attempt} attempts`);
        return result;
      }

      if (attempt % 5 === 0) {
        console.log(`⏳ Still waiting... (attempt ${attempt}/${maxAttempts})`);
      }

      await new Promise(resolve => setTimeout(resolve, waitInterval));

    } catch (error: any) {
      if (error.message && error.message.includes("not found")) {
        // Transaction not found yet, continue waiting
        if (attempt % 10 === 0) {
          console.log(`⏳ Transaction not found yet... (attempt ${attempt}/${maxAttempts})`);
        }
        await new Promise(resolve => setTimeout(resolve, waitInterval));
        continue;
      }

      // Other error, rethrow
      throw error;
    }
  }

  throw new Error(`Transaction did not complete within ${maxWaitTime / 1000} seconds`);
}

// Run the example
createKeyPageExample().catch(console.error);