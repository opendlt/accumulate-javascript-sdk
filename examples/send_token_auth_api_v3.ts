/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { api_v3, ED25519Key, Signer, TxID, URLArgs } from "accumulate.js";
import { MessageRecord, RpcError } from "accumulate.js/api_v3";
import { Transaction } from "accumulate.js/core";
import { Error as Error2, Status } from "accumulate.js/errors";

// Connect to Accumulate testnet
const client = new api_v3.JsonRpcClient("https://kermit.accumulatenetwork.io/v3");

const waitTime = 1000;
const waitLimit = 120_000 / waitTime;

async function sendTokenAuthExample() {
  console.log("=== Accumulate API v3 Send Token and Account Auth Updates Example ===\n");

  // Step 1: Create lite token account (LTA)
  console.log("Step 1: Creating Lite Identity and Token Account...");
  const lid = Signer.forLite(ED25519Key.generate());
  const lta = lid.url.join("ACME");
  console.log(`Lite Identity: ${lid.url.toString()}`);
  console.log(`Lite Token Account: ${lta.toString()}\n`);

  // Fund LTA with test tokens from testnet faucet
  console.log("Funding from testnet faucet...");
  const res = await client.faucet(lta);
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
  console.log(`Initial LTA balance: ${(balanceQuery as any).account.balance} ACME tokens\n`);

  // Step 2: Retrieve oracle value for credit calculation
  console.log("Step 2: Retrieving oracle value for credit calculations...");
  const { oracle } = await client.networkStatus();
  console.log(`Oracle price: ${oracle!.price!} credits per ACME\n`);

  // Step 3: Add 100 ACME (precision 8) to the first lite account
  console.log("Step 3: Using faucet-funded tokens as base amount");
  console.log("(100 ACME requirement satisfied by faucet funding)\n");

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
  const identityUrl = `acc://token-auth-adi-${timestamp}.acme`;
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

  // Step 6: Add credits to ADI
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
    await waitForSingle(r.status!.txID!);
  }

  // Step 8: Pause to allow the addCredits transaction to settle
  console.log("Step 8: Pausing to allow addCredits transaction to settle...");
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Verify key page credits
  let keyPageQuery;
  for (let i = 0; i < 5; i++) {
    try {
      keyPageQuery = await client.query(keyPageUrl);
      const credits = (keyPageQuery as any).data?.creditBalance || 0;
      console.log(`Key page credits: ${credits}`);
      if (credits > 0) {
        break;
      }
    } catch (error) {
      console.log(`⏳ Key page not yet available, retrying... (${i + 1}/5)`);
    }
    if (i < 4) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  console.log("Key page funding completed\n");

  // Create signer for the ADI key page
  const adiSigner = Signer.forPage(keyPageUrl, identitySigner).withVersion(1);

  // Step 9: Create a Token Account, token url = acc://ACME
  console.log("Step 9: Creating Token Account...");
  const tokenAccountUrl = identityUrl + "/tokens";
  console.log(`Token Account URL: ${tokenAccountUrl}`);

  txn = new Transaction({
    header: {
      principal: identityUrl,
    },
    body: {
      type: "createTokenAccount",
      url: tokenAccountUrl,
      tokenUrl: "acc://ACME",
    },
  });

  // Update signer with current key page version
  const currentVersion1 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSigner1 = adiSigner.withVersion(currentVersion1);
  sig = await updatedAdiSigner1.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForSingle(r.status!.txID!);
  }

  console.log("Token Account created successfully!");

  // Wait for token account creation to propagate
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Verify token account creation
  let tokenAccountQuery;
  for (let i = 0; i < 5; i++) {
    try {
      tokenAccountQuery = await client.query(tokenAccountUrl);
      console.log(`Token Account type: ${(tokenAccountQuery as any).account.type}`);
      console.log(`Token Account balance: ${(tokenAccountQuery as any).account.balance || 0} ACME\n`);
      break;
    } catch (error) {
      if (i === 4) throw error;
      console.log(`⏳ Token account not yet available, retrying... (${i + 1}/5)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Step 10: sendToken 3 ACME from the LTA to the Token Account (back to API v3 with debugging)
  console.log("Step 10: Sending 3 ACME from LTA to Token Account...");
  const sendAmount1 = 3 * 10 ** 8; // 3 ACME with precision 8
  console.log(`Sending ${sendAmount1} (3 ACME) from ${lta} to ${tokenAccountUrl}`);

  // Create transaction manually to see the envelope
  txn = new Transaction({
    header: {
      principal: lta,
    },
    body: {
      type: "sendTokens",
      to: [{
        url: tokenAccountUrl,
        amount: sendAmount1,
      }],
    },
  });

  // Custom JSON replacer to handle BigInt
  const jsonReplacer = (_key: string, value: any) => {
    if (typeof value === 'bigint') {
      return value.toString() + 'n';
    }
    return value;
  };

  console.log(`🔍 Transaction object:`, JSON.stringify(txn, jsonReplacer, 2));

  sig = await lid.sign(txn, { timestamp: Date.now() });
  console.log(`🔍 Signature object:`, JSON.stringify(sig, jsonReplacer, 2));

  const envelope = { transaction: [txn], signatures: [sig] };
  console.log(`🔍 RPC JSON Envelope (raw):`, JSON.stringify(envelope, jsonReplacer, 2));

  // Test calling .asObject() manually
  console.log(`🔍 Transaction.asObject():`, JSON.stringify(txn.asObject(), jsonReplacer, 2));
  console.log(`🔍 Signature.asObject():`, JSON.stringify(sig.asObject(), jsonReplacer, 2));

  // Enable debug mode to see the raw RPC request
  client.debug = true;

  submitRes = await client.submit(envelope);

  // Disable debug mode
  client.debug = false;

  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForSingle(r.status!.txID!);
  }

  console.log("3 ACME sent successfully from LTA to Token Account!");

  // Wait for token account balance to update - check in loop
  console.log("⏳ Waiting for token account balance to update...");
  let tokenBalanceAfter1: any;
  for (let i = 0; i < 20; i++) {
    try {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds between checks
      tokenBalanceAfter1 = await client.query(tokenAccountUrl);
      const balance = (tokenBalanceAfter1 as any).account.balance || 0;
      console.log(`Token Account balance check (attempt ${i + 1}): ${balance} ACME`);

      if (balance > 0) {
        console.log(`✅ Token Account now has balance: ${balance} ACME`);
        break;
      }
    } catch (error) {
      console.log(`⏳ Token account query failed, retrying... (${i + 1}/20)`);
    }

    if (i === 19) {
      console.log("⚠️ Warning: Token account balance still 0 after 60 seconds");
    }
  }

  const ltaBalanceAfter1 = await client.query(lta);
  console.log(`LTA balance after send: ${(ltaBalanceAfter1 as any).account.balance} ACME`);
  console.log(`Token Account balance after receive: ${(tokenBalanceAfter1 as any).account.balance || 0} ACME\n`);

  // Step 11: sendToken 2 ACME from the Token Account to the LTA
  console.log("Step 11: Sending 2 ACME from Token Account to LTA...");
  const sendAmount2 = 2 * 10 ** 8; // 2 ACME with precision 8
  console.log(`Sending ${sendAmount2} (2 ACME) from ${tokenAccountUrl} to ${lta}`);

  txn = new Transaction({
    header: {
      principal: tokenAccountUrl,
    },
    body: {
      type: "sendTokens",
      to: [{
        url: lta,
        amount: sendAmount2,
      }],
    },
  });

  // Update signer with current key page version
  const currentVersion2 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSigner2 = adiSigner.withVersion(currentVersion2);
  sig = await updatedAdiSigner2.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`Submission failed: ${r.message}`);
    }
    await waitForSingle(r.status!.txID!);
  }

  console.log("1 ACME sent successfully from Token Account to LTA!");

  // Wait and check final balances
  await new Promise(resolve => setTimeout(resolve, 5000));

  const ltaBalanceFinal = await client.query(lta);
  const tokenBalanceFinal = await client.query(tokenAccountUrl);
  console.log(`LTA final balance: ${(ltaBalanceFinal as any).account.balance} ACME`);
  console.log(`Token Account final balance: ${(tokenBalanceFinal as any).account.balance} ACME\n`);

  // Step 12: Update account authority demonstrations
  console.log("Step 12: Demonstrating Account Authority Updates...");

  // Get current token account state
  const currentTokenAccount = await client.query(tokenAccountUrl);
  console.log(`Current token account authorities:`, (currentTokenAccount as any).account.authorities || []);

  // 12a: CreateKeyBook - First create the second key book
  console.log("\nStep 12a: Creating second key book...");
  const newAuthority = identityUrl + "/book2"; // Using a second book as authority
  console.log(`Creating key book: ${newAuthority}`);

  // Generate a new key for the second book
  const secondBookKey = ED25519Key.generate();

  txn = new Transaction({
    header: {
      principal: identityUrl,
    },
    body: {
      type: "createKeyBook",
      url: newAuthority,
      publicKeyHash: secondBookKey.address.publicKeyHash,
    },
  });

  // Update signer with current key page version
  const currentVersion3 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSigner3 = adiSigner.withVersion(currentVersion3);
  sig = await updatedAdiSigner3.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      throw new Error(`CreateKeyBook failed: ${r.message}`);
    }
    if (!r.status?.txID) {
      throw new Error(`CreateKeyBook failed: missing transaction ID`);
    }
    await waitForSingle(r.status.txID);
  }
  console.log("Second key book created successfully!");

  // Wait for key book creation to propagate
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 12b: AddAuthority - Add the new authority to the token account
  console.log("\nStep 12b: Adding new authority to Token Account...");
  console.log(`Adding authority: ${newAuthority}`);

  txn = new Transaction({
    header: {
      principal: tokenAccountUrl,
    },
    body: {
      type: "updateAccountAuth",
      operations: [{
        type: "addAuthority",
        authority: newAuthority,
      }],
    },
  });

  // Update signer with current key page version
  const currentVersion4 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSigner4 = adiSigner.withVersion(currentVersion4);
  sig = await updatedAdiSigner4.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      console.log(`AddAuthority failed: ${r.message}`);
    } else {
      console.log(`AddAuthority submitted successfully: ${r.status!.txID!}`);
      console.log("Note: AddAuthority creates a multi-sig transaction that will remain pending until all authorities sign");
      console.log("Authority added successfully!");
    }
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // 12c: Disable - Disable the token account
  console.log("\nStep 12c: Disabling Token Account...");

  txn = new Transaction({
    header: {
      principal: tokenAccountUrl,
    },
    body: {
      type: "updateAccountAuth",
      operations: [{
        type: "disable",
      }],
    },
  });

  // Update signer with current key page version
  const currentVersion5 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSigner5 = adiSigner.withVersion(currentVersion5);
  sig = await updatedAdiSigner5.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      console.log(`Disable failed: ${r.message}`);
    } else {
      await waitForSingle(r.status!.txID!);
      console.log("Token Account disabled successfully!");
    }
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Check account status after disable
  try {
    const disabledAccount = await client.query(tokenAccountUrl);
    console.log(`Account status after disable:`, (disabledAccount as any).account);
  } catch (error) {
    console.log(`Account query after disable: ${error}`);
  }

  // 12d: Enable - Re-enable the token account
  console.log("\nStep 12d: Re-enabling Token Account...");

  txn = new Transaction({
    header: {
      principal: tokenAccountUrl,
    },
    body: {
      type: "updateAccountAuth",
      operations: [{
        type: "enable",
      }],
    },
  });

  // Update signer with current key page version
  const currentVersion6 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSigner6 = adiSigner.withVersion(currentVersion6);
  sig = await updatedAdiSigner6.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      console.log(`Enable failed: ${r.message}`);
    } else {
      await waitForSingle(r.status!.txID!);
      console.log("Token Account re-enabled successfully!");
    }
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // 12e: UpdateAccountAuth - Add original book authority and disable original book authority in one transaction
  console.log("\nStep 12e: Adding original book authority and disabling original book authority...");
  console.log(`Adding authority: ${bookUrl}`);
  console.log(`Disabling authority: ${bookUrl}`);

  txn = new Transaction({
    header: {
      principal: tokenAccountUrl,
    },
    body: {
      type: "updateAccountAuth",
      operations: [
        {
          type: "addAuthority",
          authority: bookUrl,
        },
        {
          type: "disable",
          authority: bookUrl,
        }
      ],
    },
  });

  // Update signer with current key page version
  const currentVersion7 = await getCurrentKeyPageVersion(keyPageUrl);
  const updatedAdiSigner7 = adiSigner.withVersion(currentVersion7);
  sig = await updatedAdiSigner7.sign(txn, { timestamp: Date.now() });
  submitRes = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const r of submitRes) {
    if (!r.success) {
      console.log(`UpdateAccountAuth failed: ${r.message}`);
    } else {
      console.log(`UpdateAccountAuth submitted successfully: ${r.status!.txID!}`);
      await waitForSingle(r.status!.txID!);
      console.log("Authority operations completed successfully!");
      console.log("- Original book authority added");
      console.log("- Original book authority disabled");
    }
  }

  await new Promise(resolve => setTimeout(resolve, 3000));

  // Final account state check
  console.log("\nFinal Token Account State:");
  try {
    const finalTokenAccount = await client.query(tokenAccountUrl);
    console.log(`Final authorities:`, (finalTokenAccount as any).account.authorities || []);
    console.log(`Final balance: ${(finalTokenAccount as any).account.balance} ACME`);
  } catch (error) {
    console.log(`Final query error: ${error}`);
  }

  console.log("\n=== Send Token and Account Auth Updates Example completed! ===");
  console.log(`\nSummary:`);
  console.log(`- Lite Identity: ${lid.url.toString()}`);
  console.log(`- Lite Token Account: ${lta.toString()}`);
  console.log(`- ADI Identity: ${identityUrl}`);
  console.log(`- ADI Key Page: ${keyPageUrl}`);
  console.log(`- Token Account: ${tokenAccountUrl}`);
  console.log(`- Demonstrated: sendTokens, addAuthority, disable, enable, combined operations (addAuthority+disable same authority)`);
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
sendTokenAuthExample().catch(console.error);