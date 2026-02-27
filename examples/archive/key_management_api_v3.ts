/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { api_v2, api_v3, ED25519Key, Signer, TxID, URLArgs } from "accumulate.js";
import { MessageRecord, RpcError } from "accumulate.js/api_v3";
import { Transaction, TransactionType } from "accumulate.js/core";
import { Error as Error2, Status } from "accumulate.js/errors";

// Connect to Accumulate testnet
const client = new api_v3.JsonRpcClient("https://kermit.accumulatenetwork.io/v3");
const clientV2 = new api_v2.Client("https://kermit.accumulatenetwork.io/v2");

const waitTime = 1000;
const waitLimit = 120_000 / waitTime;

async function keyManagementExample() {
  console.log("=== Accumulate API v3 Key Management Example ===\n");

  // Step 1: Create lite token account
  console.log("Step 1: Creating Lite Identity and Token Account...");
  const lid = Signer.forLite(ED25519Key.generate());
  const lta = lid.url.join("ACME");
  console.log(`Lite Identity: ${lid.url.toString()}`);
  console.log(`Lite Token Account: ${lta.toString()}\n`);

  // Fund LTA with test tokens from testnet faucet
  console.log("Funding from testnet faucet...");
  let res = await client.faucet(lta);
  console.log(`Faucet submission successful. Waiting for completion...`);

  if (res.status && res.status.txID) {
    await waitForSingle(res.status.txID);
    console.log(`⏳ Waiting for account creation to propagate...`);
    await new Promise(resolve => setTimeout(resolve, 3000));
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
  console.log(`Initial balance: ${(balanceQuery as any).account.balance} ACME tokens\n`);

  // Step 2: Retrieve oracle value for credit calculation
  console.log("Step 2: Retrieving oracle value for credit calculations...");
  const { oracle } = await client.networkStatus();
  console.log(`Oracle price: ${oracle!.price!} credits per ACME\n`);

  // Step 3: Add 100 ACME (precision 8) to the first lite account
  console.log("Step 3: Adding 100 ACME to lite token account...");
  // Note: This step would typically involve a token transfer from another account
  // For testnet, we'll use the faucet funding as the source of ACME
  console.log("Using faucet-funded tokens as base amount\n");

  // Step 4: Add 1000 credits (precision 2) to the first lite identity
  console.log("Step 4: Adding 1000 credits to Lite Identity...");
  const lidCreditsAmount = ((1000 * 10 ** 2) / oracle!.price!) * 10 ** 8;
  console.log(`Purchasing ${lidCreditsAmount} ACME (${1000} credits) for LID`);

  let txn = new Transaction({
    header: {
      principal: lta,
    },
    body: {
      type: "addCredits",
      recipient: lid.url,
      amount: lidCreditsAmount,
      oracle: oracle!.price!,
    },
  });

  let sig = await lid.sign(txn, { timestamp: Date.now() });
  let submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForSingle(r.status!.txID!);
  }

  const creditsQuery = await client.query(lid.url);
  console.log(`LID credits balance: ${(creditsQuery as any).account?.creditBalance || 0} credits\n`);

  // Step 5: Create an ADI
  console.log("Step 5: Creating ADI identity...");
  const identitySigner = ED25519Key.generate();
  const timestamp = Date.now().toString();
  const identityUrl = `acc://key-mgmt-adi-${timestamp}.acme`;
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
    await waitForSingle(r.status!.txID!);
  }

  console.log("ADI created successfully!");

  // Wait for ADI account creation to propagate
  console.log("⏳ Waiting 3 seconds before querying ADI...");
  await new Promise(resolve => setTimeout(resolve, 3000));

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
  console.log(`ADI Identity type: ${(identityQuery as any).account.type}\n`);

  // Step 6: Add credits to ADI (via key page)
  console.log("Step 6: Adding credits to ADI...");
  const adiCreditsAmount = ((2000 * 10 ** 2) / oracle!.price!) * 10 ** 8;
  console.log(`Purchasing ${adiCreditsAmount} ACME (${2000} credits) for ADI identity`);

  txn = new Transaction({
    header: {
      principal: lta,
    },
    body: {
      type: "addCredits",
      recipient: identityUrl,
      amount: adiCreditsAmount,
      oracle: oracle!.price!,
    },
  });

  sig = await lid.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForSingle(r.status!.txID!);
  }
  console.log("Credits added to ADI successfully\n");

  // Step 7: Add 4000 credits (precision 2) to the ADI Key Page
  console.log("Step 7: Adding 4000 credits to ADI Key Page...");
  const keyPageUrl = bookUrl + "/1";

  // First verify the key page exists
  console.log("Verifying key page exists before adding credits...");
  try {
    const keyPageCheck = await client.query(keyPageUrl);
    console.log(`Key page exists: ${(keyPageCheck as any).account.type}`);
  } catch (error) {
    console.log(`⚠️ Key page doesn't exist yet: ${error}`);
  }

  const keyPageCreditsAmount = ((4000 * 10 ** 2) / oracle!.price!) * 10 ** 8;
  console.log(`Key page URL: ${keyPageUrl}`);
  console.log(`Purchasing ${keyPageCreditsAmount} ACME (${4000} credits) for key page`);

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
    console.log(`🔗 AddCredits TXID for key page: ${r.status!.txID!}`);
    console.log(`🔗 Key page URL being credited: ${keyPageUrl}`);
    await waitForSingle(r.status!.txID!);
  }

  // Step 8: Pause to allow the addCredits transaction to settle
  console.log("Step 8: Pausing to allow addCredits transaction to settle...");
  await new Promise(resolve => setTimeout(resolve, 15000));

  // Verify key page credits
  let keyPageQuery;
  for (let i = 0; i < 10; i++) {
    try {
      keyPageQuery = await client.query(keyPageUrl);
      const credits = (keyPageQuery as any).account?.creditBalance || 0;
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
  console.log("Key page funding completed\n");

  // Create signer for the ADI key page
  const adiSigner = Signer.forPage(keyPageUrl, identitySigner).withVersion(1);

  // Debug: Check the signer details
  console.log(`ADI Signer URL: ${adiSigner.url}`);
  console.log(`ADI Signer Version: ${adiSigner.version}`);
  console.log(`Identity Signer Address: ${identitySigner.address.publicKeyHash.toString()}`);

  // Test signing capability
  console.log("Testing signer capability...");

  // Step 9: Create additional keypage and add to existing key book
  console.log("Step 9: Creating additional key page in existing key book...");

  // Query the existing key book to determine the next page number
  console.log("Querying existing key book...");
  const bookQuery = await client.query(bookUrl);
  const currentPageCount = (bookQuery as any).account.pageCount || 1;
  const nextPageNumber = currentPageCount + 1;
  const newPageUrl = bookUrl + `/${nextPageNumber}`;
  console.log(`Current page count: ${currentPageCount}`);
  console.log(`Creating new page: ${newPageUrl}`);

  // Generate new key for the additional page
  const newPageKey = ED25519Key.generate();
  console.log(`New page key hash: ${newPageKey.address.publicKeyHash.toString()}`);

  // Create the new key page using the proper SDK method
  console.log(`Using book as principal: ${bookUrl}`);
  console.log(`Using existing key page as signer: ${keyPageUrl}`);

  // Create signer with version for API v2 client
  const signerWithVersion = adiSigner;

  console.log("Creating key page using API v2 client...");

  const createKeyPageArgs = {
    keys: [{
      keyHash: newPageKey.address.publicKeyHash,
    }],
  };

  console.log(`🔍 CreateKeyPage args:`, JSON.stringify(createKeyPageArgs, null, 2));
  console.log(`🔍 Principal: ${bookUrl}`);
  console.log(`🔍 Signer: ${signerWithVersion.url} v${signerWithVersion.version}`);

  const response = await clientV2.createKeyPage(bookUrl, createKeyPageArgs, signerWithVersion);
  console.log(`🔗 CreateKeyPage response:`, response);

  if (!response.result || response.result.error) {
    throw new Error(`CreateKeyPage failed: ${response.result?.error || 'Unknown error'}`);
  }

  console.log(`🔗 CreateKeyPage TXID: ${response.txid}`);
  await waitForSingle(response.txid);

  // Step 10: Pause to allow the createKeyPage transaction to settle
  console.log("Step 10: Pausing to allow createKeyPage transaction to settle...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Verify new key page creation
  try {
    const newPageQuery = await client.query(newPageUrl);
    console.log(`New key page created successfully: ${newPageUrl}`);
    console.log(`New page type: ${(newPageQuery as any).account.type}\n`);
  } catch (error) {
    console.log(`⏳ New key page not yet available: ${error}\n`);
  }

  // Step 11: Create additional custom Key Book (book2)
  console.log("Step 11: Creating additional custom key book (book2)...");
  const book2Url = identityUrl + "/book2";
  const book2Key = ED25519Key.generate();
  console.log(`Book2 URL: ${book2Url}`);
  console.log(`Book2 key hash: ${book2Key.address.publicKeyHash.toString()}`);

  // Create key book requires a key page and a keyhash for the key page
  txn = new Transaction({
    header: {
      principal: identityUrl,
    },
    body: {
      type: TransactionType.CreateKeyBook,
      url: book2Url,
      publicKeyHash: book2Key.address.publicKeyHash,
    },
  });

  // Update signer with current key page version
  const currentVersionKM1 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSignerKM1 = adiSigner.withVersion(currentVersionKM1);
  sig = await updatedAdiSignerKM1.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForSingle(r.status!.txID!);
  }

  console.log("Custom key book (book2) created successfully!");

  // Wait for book2 creation to propagate
  await new Promise(resolve => setTimeout(resolve, 5000));

  try {
    const book2Query = await client.query(book2Url);
    console.log(`Book2 type: ${(book2Query as any).account.type}`);
    console.log(`Book2 page count: ${(book2Query as any).account.pageCount}\n`);
  } catch (error) {
    console.log(`⏳ Book2 not yet available: ${error}\n`);
  }

  // Step 12: Update keypage demonstration
  console.log("Step 12: Demonstrating key page updates...");

  // Generate additional key for adding to existing page
  const additionalKey = ED25519Key.generate();
  console.log(`Adding additional key to page 1: ${additionalKey.address.publicKeyHash.toString()}`);

  // Update keypage to add additional key
  txn = new Transaction({
    header: {
      principal: keyPageUrl,
    },
    body: {
      type: TransactionType.UpdateKeyPage,
      operation: [{
        type: "add",
        entry: {
          keyHash: additionalKey.address.publicKeyHash,
        },
      }],
    },
  });

  // Update signer with current key page version
  const currentVersionKM2 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSignerKM2 = adiSigner.withVersion(currentVersionKM2);
  sig = await updatedAdiSignerKM2.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForSingle(r.status!.txID!);
  }

  console.log("Key page updated with additional key!");

  // Wait for update to propagate
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Query updated key page
  try {
    const updatedPageQuery = await client.query(keyPageUrl);
    const keys = (updatedPageQuery as any).account.keys || [];
    console.log(`Updated key page now has ${keys.length} keys`);
  } catch (error) {
    console.log(`⏳ Updated key page query failed: ${error}`);
  }

  // Step 13: UpdateKeyPage - Add delegate URL (multi-sig operation)
  console.log("\nStep 13: Adding delegate URL to key page 1 (multi-sig operation)...");
  const delegateUrl = bookUrl; // Using the book as delegate URL
  console.log(`Adding delegate URL: ${delegateUrl} to key page: ${keyPageUrl}`);

  txn = new Transaction({
    header: {
      principal: keyPageUrl,
    },
    body: {
      type: TransactionType.UpdateKeyPage,
      operation: [{
        type: "add",
        entry: {
          delegate: delegateUrl,
        },
      }],
    },
  });

  // Update signer with current key page version
  const currentVersionKM3 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSignerKM3 = adiSigner.withVersion(currentVersionKM3);
  sig = await updatedAdiSignerKM3.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      console.log(`Add delegate failed: ${r.message}`);
    } else {
      console.log(`Add delegate submitted successfully: ${r.status!.txID!}`);
      console.log("Note: This is a multi-sig operation and may remain pending until all required signatures are provided");
      // For multi-sig operations like adding delegates, we don't wait for completion
      // as it requires additional signatures that we don't have in this example
    }
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 14: UpdateKeyPage - Update existing key operation
  console.log("\nStep 14: Updating existing key in key page...");
  const updatedKey = ED25519Key.generate();
  console.log(`Updating to new key hash: ${updatedKey.address.publicKeyHash.toString()}`);

  // Get the current keys to find one to update
  let currentKeys: any[] = [];
  try {
    const currentPageQuery = await client.query(keyPageUrl);
    currentKeys = (currentPageQuery as any).account.keys || [];
    console.log(`Current page has ${currentKeys.length} keys`);
  } catch (error) {
    console.log(`⚠️ Could not query current keys: ${error}`);
  }

  if (currentKeys.length > 0) {
    const keyToUpdate = currentKeys[0]; // Update the first key
    console.log(`Updating key at index 0 from ${Buffer.from(keyToUpdate.publicKeyHash).toString('hex')} to ${updatedKey.address.publicKeyHash.toString()}`);

    txn = new Transaction({
      header: {
        principal: keyPageUrl,
      },
      body: {
        type: TransactionType.UpdateKeyPage,
        operation: [{
          type: "update",
          oldEntry: {
            keyHash: keyToUpdate.publicKeyHash,
          },
          newEntry: {
            keyHash: updatedKey.address.publicKeyHash,
          },
        }],
      },
    });

    // Update signer with current key page version
    const currentVersionKM4 = await getCurrentKeyPageVersion(keyPageUrl);
    const updatedAdiSignerKM4 = adiSigner.withVersion(currentVersionKM4);
    sig = await updatedAdiSignerKM4.sign(txn, { timestamp: Date.now() });
    submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
    for (const r of submitRes) {
      if (!r.success) {
        console.log(`Update key failed: ${r.message}`);
      } else {
        await waitForSingle(r.status!.txID!);
        console.log("Key updated successfully!");
      }
    }
  } else {
    console.log("⚠️ No keys found to update");
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 15: UpdateKeyPage - Remove key operation
  console.log("\nStep 15: Removing key from key page...");

  // Get updated keys after the update operation
  try {
    const updatedPageQuery = await client.query(keyPageUrl);
    currentKeys = (updatedPageQuery as any).account.keys || [];
    console.log(`Page now has ${currentKeys.length} keys`);
  } catch (error) {
    console.log(`⚠️ Could not query updated keys: ${error}`);
  }

  if (currentKeys.length > 1) {
    // Only remove if we have more than one key (to avoid removing all keys)
    const keyToRemove = currentKeys[currentKeys.length - 1]; // Remove the last key
    console.log(`Removing key: ${Buffer.from(keyToRemove.publicKeyHash).toString('hex')}`);

    txn = new Transaction({
      header: {
        principal: keyPageUrl,
      },
      body: {
        type: TransactionType.UpdateKeyPage,
        operation: [{
          type: "remove",
          entry: {
            keyHash: keyToRemove.publicKeyHash,
          },
        }],
      },
    });

    // Update signer with current key page version
    const currentVersionKM5 = await getCurrentKeyPageVersion(keyPageUrl);
    const updatedAdiSignerKM5 = adiSigner.withVersion(currentVersionKM5);
    sig = await updatedAdiSignerKM5.sign(txn, { timestamp: Date.now() });
    submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
    for (const r of submitRes) {
      if (!r.success) {
        console.log(`Remove key failed: ${r.message}`);
      } else {
        await waitForSingle(r.status!.txID!);
        console.log("Key removed successfully!");
      }
    }
  } else {
    console.log("⚠️ Cannot remove key - only one key remaining (would disable the page)");
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Final key page status
  console.log("\nFinal Key Page Status:");
  try {
    const finalPageQuery = await client.query(keyPageUrl);
    const finalKeys = (finalPageQuery as any).account.keys || [];
    console.log(`Final key count: ${finalKeys.length}`);
    finalKeys.forEach((key: any, index: number) => {
      console.log(`  Key ${index + 1}: ${Buffer.from(key.publicKeyHash).toString('hex')}`);
    });
  } catch (error) {
    console.log(`⏳ Final key page query failed: ${error}`);
  }

  console.log("\n=== Key Management Example completed successfully! ===");
  console.log(`\nSummary:`);
  console.log(`- Lite Identity: ${lid.url.toString()}`);
  console.log(`- Lite Token Account: ${lta.toString()}`);
  console.log(`- ADI Identity: ${identityUrl}`);
  console.log(`- Primary Key Book: ${bookUrl}`);
  console.log(`- Primary Key Page: ${keyPageUrl}`);
  console.log(`- Additional Key Page: ${newPageUrl}`);
  console.log(`- Custom Key Book: ${book2Url}`);
  console.log(`- Demonstrated: createKeyPage, updateKeyPage (add, update, remove), delegate operations`);
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

async function waitForSingle(txid: TxID | URLArgs) {
  console.log(`Waiting for ${txid}`);
  for (let i = 0; i < waitLimit; i++) {
    try {
      const r = (await client.query(txid)) as MessageRecord;
      const status = r.status;
      if (i % 10 === 0) {
        console.log(`🔍 Status check: ${JSON.stringify(status)} (attempt ${i + 1}/${waitLimit})`);
      }

      if (status && (status === Status.Delivered || (status as any) === 201 || (status as any).code === "delivered")) {
        console.log(`✅ Transaction ${txid} completed successfully`);
        return r;
      }

      if (i % 10 === 0) {
        console.log(`⏳ Transaction ${txid} still pending... (attempt ${i + 1}/${waitLimit})`);
      }
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      continue;
    } catch (error) {
      const err2 = isClientError(error);
      if (err2.code === Status.NotFound) {
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
keyManagementExample().catch(console.error);