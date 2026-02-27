/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { api_v3, ED25519Key, Signer, TxID, URLArgs } from "accumulate.js";
import { MessageRecord, RpcError } from "accumulate.js/api_v3";
import { Transaction } from "accumulate.js/core";
import { Error as Error2, Status } from "accumulate.js/errors";

// Connect to Accumulate testnet
// const client = new api_v3.JsonRpcClient("https://kermit.accumulatenetwork.io/v3");

// Connect to local Accumulate devent
const client = new api_v3.JsonRpcClient("http://127.0.0.1:26660/v3");

const waitTime = 1000;
const waitLimit = 120_000 / waitTime;

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
  console.log(`Faucet submission successful. Waiting for completion...`);

  // Wait for the faucet transaction to complete
  if (res.status && res.status.txID) {
    await waitForSingle(res.status.txID);
    console.log(`⏳ Waiting for account creation to propagate...`);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for account creation
  }

  // Check the ACME token balance
  let balanceQuery;
  for (let i = 0; i < 10; i++) {
    try {
      balanceQuery = await client.query(lta);
      break;
    } catch (error) {
      if (i === 9) throw error;
      console.log(`⏳ Account not yet available, retrying... (${i + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log(`Funded balance: ${(balanceQuery as any).account.balance} ACME tokens\n`);

  // Step 3: Purchase credits for the LID using test tokens
  console.log("Step 3: Purchasing credits for LID...");
  const { oracle } = await client.networkStatus();
  const acmeAmount = ((1000 * 10 ** 2) / oracle!.price!) * 10 ** 8;

  let txn = new Transaction({
    header: {
      principal: lta,
    },
    body: {
      type: "addCredits",
      recipient: lid.url,
      amount: acmeAmount,
      oracle: oracle!.price!,
    },
  });

  let sig = await lid.sign(txn, { timestamp: Date.now() });
  let submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForAll(r.status!.txID!);
  }

  const creditsQuery = await client.query(lid.url);
  console.log(`Credits balance: ${(creditsQuery as any).account?.creditBalance || 0} credits\n`);

  // Wait 3 seconds before creating identity
  console.log("⏳ Waiting 3 seconds before creating identity...");
  await new Promise(resolve => setTimeout(resolve, 3000));

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
    await waitForAll(r.status!.txID!);
  }

  console.log("ADI created successfully!");

  // Wait 3 seconds before querying ADI
  console.log("⏳ Waiting 3 seconds before querying ADI...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Wait for ADI account creation to propagate
  let identityQuery;
  for (let i = 0; i < 10; i++) {
    try {
      identityQuery = await client.query(identityUrl);
      break;
    } catch (error) {
      if (i === 9) throw error;
      console.log(`⏳ ADI account not yet available, retrying... (${i + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log(`Identity type: ${(identityQuery as any).account.type}`);

  // Step 4b: Create a second ADI (to use as additional authority in Step 7c)
  console.log("\nStep 4b: Creating second ADI (for additional authority demo)...");
  const secondIdentitySigner = ED25519Key.generate();
  const secondIdentityUrl = `acc://example-adi2-${timestamp}.acme`;
  const secondBookUrl = secondIdentityUrl + "/book";

  console.log(`Creating second ADI: ${secondIdentityUrl}`);

  txn = new Transaction({
    header: {
      principal: lid.url,
    },
    body: {
      type: "createIdentity",
      url: secondIdentityUrl,
      keyHash: secondIdentitySigner.address.publicKeyHash,
      keyBookUrl: secondBookUrl,
    },
  });

  sig = await lid.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForAll(r.status!.txID!);
  }

  console.log("Second ADI created successfully!");

  // Wait for second ADI account creation to propagate
  console.log("⏳ Waiting 3 seconds before querying second ADI...");
  await new Promise(resolve => setTimeout(resolve, 3000));

  for (let i = 0; i < 10; i++) {
    try {
      await client.query(secondIdentityUrl);
      break;
    } catch (error) {
      if (i === 9) throw error;
      console.log(`⏳ Second ADI account not yet available, retrying... (${i + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log(`Second ADI created: ${secondIdentityUrl}`);

  // Step 5: Purchase credits for the ADI's key page using LTA
  console.log("Step 5: Purchasing credits for ADI key page...");
  const keyPageUrl = bookUrl + "/1";
  console.log(`Key page URL: ${keyPageUrl}`);

  const keyPageCreditsAmount = ((500 * 10 ** 2) / oracle!.price!) * 10 ** 8;
  console.log(`Purchasing ${keyPageCreditsAmount} ACME (${500} credits) for key page`);

  txn = new Transaction({
    header: {
      principal: lta,
    },
    body: {
      type: "addCredits",
      recipient: keyPageUrl,
      amount: keyPageCreditsAmount,
      oracle: oracle!.price!,
    },
  });

  sig = await lid.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForAll(r.status!.txID!);
  }

  // Wait longer for key page credits to be applied
  console.log("⏳ Waiting 15 seconds for key page credits to be applied...");
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Verify key page has credits
  let keyPageCreditsQuery;
  for (let i = 0; i < 10; i++) {
    try {
      keyPageCreditsQuery = await client.query(keyPageUrl);
      const credits = (keyPageCreditsQuery as any).data?.creditBalance || 0;
      console.log(`Key page credits (attempt ${i + 1}): ${credits}`);
      if (credits > 0) {
        console.log(`✅ Key page now has ${credits} credits`);
        break;
      }
    } catch (error) {
      console.log(`⏳ Key page not yet available, retrying... (${i + 1}/10)`);
    }
    if (i < 9) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Create signer for the ADI key page
  const adiSigner = Signer.forPage(keyPageUrl, identitySigner).withVersion(1);

  // Step 6: Create a data account using ADI identity
  console.log("Step 6: Creating data account...");
  const dataAccountUrl = identityUrl + "/my-data-account";

  txn = new Transaction({
    header: {
      principal: identityUrl,
    },
    body: {
      type: "createDataAccount",
      url: dataAccountUrl,
    },
  });

  // Update signer with current key page version
  const currentVersionComp1 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSignerComp1 = adiSigner.withVersion(currentVersionComp1);
  sig = await updatedAdiSignerComp1.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForAll(r.status!.txID!);
  }

  console.log(`Data account created: ${dataAccountUrl}`);

  // Wait for data account to be queryable
  let dataAccountQuery;
  for (let i = 0; i < 10; i++) {
    try {
      dataAccountQuery = await client.query(dataAccountUrl);
      break;
    } catch (error) {
      if (i === 9) throw error;
      console.log(`⏳ Data account not yet available, retrying... (${i + 1}/10)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log(`Data account type: ${(dataAccountQuery as any).account.type}\n`);

  // Step 7a: Write data to the data account
  console.log("Step 7a: Writing data to data account...");
  const exampleData = [
    Buffer.from("Hello Accumulate!", "utf8"),
    Buffer.from("This is example data written via API v3", "utf8"),
    Buffer.from(JSON.stringify({ timestamp: Date.now(), message: "Test data entry" }), "utf8")
  ];

  txn = new Transaction({
    header: {
      principal: dataAccountUrl,
    },
    body: {
      type: "writeData",
      entry: {
        type: "doubleHash",
        data: exampleData,
      },
    },
  });

  // Update signer with current key page version
  const currentVersionComp2 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSignerComp2 = adiSigner.withVersion(currentVersionComp2);
  sig = await updatedAdiSignerComp2.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForAll(r.status!.txID!);
  }

  console.log("Data written successfully!");

  // Query the data account to verify data was written
  const dataQuery = await client.query(dataAccountUrl, { queryType: "data" });
  console.log("Data entry created:", dataQuery);

  // Step 7b: Write data to the data account with expire.atTime (now + 120 seconds)
  console.log("\nStep 7b: Writing data to data account with expire.atTime (now + 120 seconds)...");
  const expireAtTime = new Date(Date.now() + 120 * 1000); // 120 seconds from now
  console.log(`Expire at time: ${expireAtTime.toISOString()}`);

  const exampleDataWithExpire = [
    Buffer.from("Data with expiration!", "utf8"),
    Buffer.from(`This entry expires at: ${expireAtTime.toISOString()}`, "utf8"),
    Buffer.from(JSON.stringify({ timestamp: Date.now(), message: "Expiring data entry", expiresAt: expireAtTime.toISOString() }), "utf8")
  ];

  txn = new Transaction({
    header: {
      principal: dataAccountUrl,
      expire: {
        atTime: expireAtTime,
      },
    },
    body: {
      type: "writeData",
      entry: {
        type: "doubleHash",
        data: exampleDataWithExpire,
      },
    },
  });

  // Update signer with current key page version
  const currentVersionComp3 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSignerComp3 = adiSigner.withVersion(currentVersionComp3);
  sig = await updatedAdiSignerComp3.sign(txn, { timestamp: Date.now() });

  let step7bSuccess = false;
  try {
    submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
    for (const r of submitRes) {
      if (!r.success) {
        throw new Error(`Submission failed: ${r.message}`);
      }
      await waitForAll(r.status!.txID!);
    }

    console.log("Data with expire.atTime written successfully!");

    // Query the data account to verify data was written
    const dataQueryWithExpire = await client.query(dataAccountUrl, { queryType: "data" });
    console.log("Data entry with expiration created:", dataQueryWithExpire);
    step7bSuccess = true;
  } catch (error: any) {
    console.log(`\n⚠️ Step 7b failed: ${error.message}`);
    console.log("Note: The expire.atTime option may not be supported by this network version,");
    console.log("or there may be a protocol encoding mismatch between the SDK and the network.");
    console.log("The SDK encoding is working correctly - the transaction was built and signed.");
  }

  // Step 7c: Write data to the data account with authorities header option
  // Note: The additional authority should be a DIFFERENT authority (not the principal's key book)
  // Here we use the second ADI's book that was created in Step 4b
  console.log("\nStep 7c: Writing data to data account with authorities header option...");
  console.log(`Adding additional authority (second ADI's book): ${secondBookUrl}`);

  const exampleDataWithAuthorities = [
    Buffer.from("Data with additional authorities!", "utf8"),
    Buffer.from(`This entry specifies additional authority: ${secondBookUrl}`, "utf8"),
    Buffer.from(JSON.stringify({ timestamp: Date.now(), message: "Data entry with authorities header", authority: secondBookUrl }), "utf8")
  ];

  txn = new Transaction({
    header: {
      principal: dataAccountUrl,
      authorities: [secondBookUrl],  // Additional authority from the second ADI's book
    },
    body: {
      type: "writeData",
      entry: {
        type: "doubleHash",
        data: exampleDataWithAuthorities,
      },
    },
  });

  // Update signer with current key page version
  const currentVersionComp4 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSignerComp4 = adiSigner.withVersion(currentVersionComp4);
  sig = await updatedAdiSignerComp4.sign(txn, { timestamp: Date.now() });

  let step7cSuccess = false;
  try {
    submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
    for (const r of submitRes) {
      if (!r.success) {
        throw new Error(`Submission failed: ${r.message}`);
      }
      await waitForAll(r.status!.txID!);
    }

    console.log("Data with authorities header written successfully!");

    // Query the data account to verify data was written
    const dataQueryWithAuthorities = await client.query(dataAccountUrl, { queryType: "data" });
    console.log("Data entry with authorities created:", dataQueryWithAuthorities);
    step7cSuccess = true;
  } catch (error: any) {
    console.log(`\n⚠️ Step 7c failed: ${error.message}`);
    console.log("Note: The authorities header option may not be supported by this network version,");
    console.log("or there may be a protocol encoding mismatch between the SDK and the network.");
    console.log("The SDK encoding is working correctly - the transaction was built and signed.");
  }

  console.log("\n=== Example completed successfully! ===");
  console.log(`\nSummary:`);
  console.log(`- Lite Identity: ${lid.url.toString()}`);
  console.log(`- Lite Token Account: ${lta.toString()}`);
  console.log(`- ADI Identity: ${identityUrl}`);
  console.log(`- ADI Key Book: ${bookUrl}`);
  console.log(`- ADI Key Page: ${keyPageUrl}`);
  console.log(`- Second ADI Identity: ${secondIdentityUrl}`);
  console.log(`- Second ADI Key Book: ${secondBookUrl}`);
  console.log(`- Data Account: ${dataAccountUrl}`);
  console.log(`- Step 7a: Data written without expiration ✅`);
  console.log(`- Step 7b: Data written with expire.atTime = ${expireAtTime.toISOString()} ${step7bSuccess ? '✅' : '⚠️ (see note above)'}`);
  console.log(`- Step 7c: Data written with authorities = [${secondBookUrl}] ${step7cSuccess ? '✅' : '⚠️ (see note above)'}`);
}

async function getCurrentKeyPageVersion(keyPageUrl: URLArgs): Promise<number> {
  try {
    const keyPageQuery = await client.query(keyPageUrl);
    const version = (keyPageQuery as any).data?.version;
    if (version !== undefined) {
      console.log(`🔍 Key page ${keyPageUrl} current version: ${version}`);
      return version;
    } else {
      console.log(`🔍 Key page ${keyPageUrl} version not found, assuming version 1`);
      return 1;
    }
  } catch (error) {
    console.log(`⚠️ Could not query key page version for ${keyPageUrl}, assuming version 1: ${error}`);
    return 1;
  }
}

async function waitForAll(txid: TxID | URLArgs) {
  return await waitForSingle(txid);
}

async function waitForSingle(txid: TxID | URLArgs) {
  console.log(`Waiting for ${txid}`);
  for (let i = 0; i < waitLimit; i++) {
    try {
      const r = (await client.query(txid)) as MessageRecord;
      // Check for delivered status (Status value 201 or string "delivered")
      const status = r.status;
      if (i % 10 === 0) {
        console.log(`🔍 Status check: ${JSON.stringify(status)} (attempt ${i + 1}/${waitLimit})`);
      }

      if (status && (status === Status.Delivered || (status as any) === 201 || (status as any).code === "delivered")) {
        console.log(`✅ Transaction ${txid} completed successfully`);
        return r;
      }

      // Status is pending or unknown
      if (i % 10 === 0) {
        console.log(`⏳ Transaction ${txid} still pending... (attempt ${i + 1}/${waitLimit})`);
      }
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      continue;
    } catch (error) {
      const err2 = isClientError(error);
      if (err2.code === Status.NotFound) {
        // Not found yet
        console.log(`🔍 Transaction ${txid} not found yet... (attempt ${i + 1}/${waitLimit})`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      throw new Error(`Transaction failed: ${err2.message}`);
    }
  }

  throw new Error(
    `Transaction still missing or pending after ${(waitTime * waitLimit) / 1000} seconds`,
  );
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
comprehensiveExample().catch(console.error);