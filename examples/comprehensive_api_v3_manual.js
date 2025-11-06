/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { api_v3, ED25519Key, Signer } from "accumulate.js";
import { RpcError } from "accumulate.js/api_v3";
import { Transaction } from "accumulate.js/core";
import { Error as Error2, Status } from "accumulate.js/errors";

// Connect to Accumulate testnet
const client = new api_v3.JsonRpcClient("https://kermit.accumulatenetwork.io/v3");

const waitTime = 500;
const waitLimit = 30_000 / waitTime;

async function comprehensiveExample() {
  console.log("=== Comprehensive Accumulate API v3 Example ===\n");

  // Step 1: Create a Lite Token Account (LTA) and Lite Identity (LID)
  console.log("Step 1: Creating Lite Identity and Token Account...");
  const lid = Signer.forLite(ED25519Key.generate());
  const lta = lid.url.join("ACME");
  console.log(`Lite Identity: ${lid.url.toString()}`);
  console.log(`Lite Token Account: ${lta.toString()}\n`);

  // Step 2: Fund LTA with test tokens from testnet faucet
  console.log("Step 2: Funding from testnet faucet...");
  let res = await client.faucet(lta);
  await waitForAll(res.status.txID);

  // Check the ACME token balance
  const balanceQuery = await client.query(lta);
  console.log(`Funded balance: ${balanceQuery.data.balance} ACME tokens\n`);

  // Step 3: Purchase credits for the LID using test tokens
  console.log("Step 3: Purchasing credits for LID...");
  const { oracle } = await client.networkStatus();
  const acmeAmount = ((1000 * 10 ** 2) / oracle.price) * 10 ** 8;

  let txn = new Transaction({
    header: {
      principal: lta,
    },
    body: {
      type: "addCredits",
      recipient: lid.url,
      amount: acmeAmount,
      oracle: oracle.price,
    },
  });

  let sig = await lid.sign(txn, { timestamp: Date.now() });
  let submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForAll(r.status.txID);
  }

  const creditsQuery = await client.query(lid.url);
  console.log(`Credits balance: ${creditsQuery.data.creditBalance} credits\n`);

  // Step 4: Create an ADI (Accumulate Digital Identity)
  console.log("Step 4: Creating ADI identity...");
  const identitySigner = ED25519Key.generate();
  const timestamp = Date.now().toString();
  const identityUrl = `acc://example-adi-${timestamp}.acme`;
  const bookUrl = identityUrl + "/book";

  console.log(`Creating ADI: ${identityUrl}`);

  txn = new Transaction({
    header: {
      principal: lid.url,
    },
    body: {
      type: "createIdentity",
      url: identityUrl,
      keyHash: identitySigner.address.publicKeyHash,
      keyBookUrl: bookUrl,
    },
  });

  sig = await lid.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForAll(r.status.txID);
  }

  console.log("ADI created successfully!");
  const identityQuery = await client.query(identityUrl);
  console.log(`Identity type: ${identityQuery.type}\n`);

  // Step 5: Purchase credits for the ADI's key page
  console.log("Step 5: Purchasing credits for ADI key page...");
  const keyPageUrl = bookUrl + "/1";
  const keyPageCreditsAmount = ((500 * 10 ** 2) / oracle.price) * 10 ** 8;

  txn = new Transaction({
    header: {
      principal: lta,
    },
    body: {
      type: "addCredits",
      recipient: keyPageUrl,
      amount: keyPageCreditsAmount,
      oracle: oracle.price,
    },
  });

  sig = await lid.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForAll(r.status.txID);
  }

  const keyPageCreditsQuery = await client.query(keyPageUrl);
  console.log(`Key page credits: ${keyPageCreditsQuery.data.creditBalance} credits\n`);

  // Create signer for the ADI key page
  const adiSigner = Signer.forPage(keyPageUrl, identitySigner).withVersion(1);

  // Step 6: Create a data account using ADI credits
  console.log("Step 6: Creating data account...");
  const dataAccountUrl = identityUrl + "/my-data-account";

  txn = new Transaction({
    header: {
      principal: keyPageUrl,
    },
    body: {
      type: "createDataAccount",
      url: dataAccountUrl,
    },
  });

  sig = await adiSigner.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForAll(r.status.txID);
  }

  console.log(`Data account created: ${dataAccountUrl}`);
  const dataAccountQuery = await client.query(dataAccountUrl);
  console.log(`Data account type: ${dataAccountQuery.type}\n`);

  // Step 7: Write data to the data account
  console.log("Step 7: Writing data to data account...");
  const exampleData = [
    Buffer.from("Hello Accumulate!", "utf8"),
    Buffer.from("This is example data written via API v3", "utf8"),
    Buffer.from(JSON.stringify({ timestamp: Date.now(), message: "Test data entry" }), "utf8")
  ];

  txn = new Transaction({
    header: {
      principal: keyPageUrl,
    },
    body: {
      type: "writeData",
      entry: {
        type: "accumulate",
        data: exampleData,
      },
    },
  });

  sig = await adiSigner.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForAll(r.status.txID);
  }

  console.log("Data written successfully!");

  // Query the data account to verify data was written
  const dataQuery = await client.query(dataAccountUrl, { queryType: "data" });
  console.log("Data entry created:", dataQuery);

  console.log("\n=== Example completed successfully! ===");
  console.log(`\nSummary:`);
  console.log(`- Lite Identity: ${lid.url.toString()}`);
  console.log(`- Lite Token Account: ${lta.toString()}`);
  console.log(`- ADI Identity: ${identityUrl}`);
  console.log(`- ADI Key Page: ${keyPageUrl}`);
  console.log(`- Data Account: ${dataAccountUrl}`);
}

async function waitForAll(txid) {
  const r = await waitForSingle(txid);
  if (!r.produced || !r.produced.records) {
    return;
  }

  for (const record of r.produced.records.filter((x) => !!x)) {
    if (record && record.value) {
      await waitForAll(record.value);
    }
  }

  return r;
}

async function waitForSingle(txid) {
  console.log(`Waiting for ${txid}`);
  for (let i = 0; i < waitLimit; i++) {
    try {
      const r = await client.query(txid);
      if (r.status === Status.Delivered) {
        return r;
      }

      // Status is pending or unknown
      await new Promise((r) => setTimeout(r, waitTime));
      continue;
    } catch (error) {
      const err2 = isClientError(error);
      if (err2.code === Status.NotFound) {
        // Not found
        await new Promise((r) => setTimeout(r, waitTime));
        continue;
      }

      throw new Error(`Transaction failed: ${err2.message}`);
    }
  }

  throw new Error(
    `Transaction still missing or pending after ${(waitTime * waitLimit) / 1000} seconds`,
  );
}

function isClientError(error) {
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
comprehensiveExample().catch(console.error);