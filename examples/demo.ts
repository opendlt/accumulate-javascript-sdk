/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { api_v3, ED25519Key, Signer, TxID, URLArgs } from "accumulate.js";
import { MessageRecord, RpcError } from "accumulate.js/lib/api_v3";
import { Transaction } from "accumulate.js/lib/core";
import { Error as Error2, Status } from "accumulate.js/lib/errors";
const client = new api_v3.JsonRpcClient("https://kermit.accumulatenetwork.io/v3");

const waitTime = 500;
const waitLimit = 30_000 / waitTime;

// Generate a random Signer (this is only local, until that account receive its first tokens)
const lid = await Signer.forLite(await ED25519Key.generate());
const lta = lid.url.join("ACME");
console.log(lta.toString());

// Request some ACME token to get started from the faucet
let res = [await client.faucet(lta)];
await waitForAll(res[0].status!.txID!);

// Check the ACME token balance
console.log(await client.query(lta));

// 1000 credits * credit precision (10^2) / (credits per acme) * acme precision (10^8)
const { oracle } = await client.networkStatus();
const acmeAmount = ((1000 * 10 ** 2) / oracle!.price!) * 10 ** 8;

// Convert some tokens into credits necessary to perform operations on Accumulate
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

// Sign and submit the transaction, and wait for it to complete
let sig = await lid.sign(txn, { timestamp: Date.now() });
res = await client.submit({ transaction: [txn], signatures: [sig] });
for (const r of res) {
  if (!r.success) {
    throw new Error(`Submission failed: ${r.message}`);
  }
  await waitForAll(r.status!.txID!);
}

// Check the credits balance
console.log(await client.query(lid.url));

// Now with the credits we can create an Accumulate Digital Identifier (ADI)
// which is one of the fundamental feature of the network

const identitySigner = await ED25519Key.generate(); // Root signer that will control the identity
const identityUrl = "acc://my-own-identity123.acme";
const bookUrl = identityUrl + "/my-book";

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
res = await client.submit({ transaction: [txn], signatures: [sig] });
for (const r of res) {
  if (!r.success) {
    throw new Error(`Submission failed: ${r.message}`);
  }
  await waitForAll(r.status!.txID!);
}

// check your identity
console.log(await client.query(identityUrl));

async function waitForAll(txid: TxID | URLArgs) {
  const r = await waitForSingle(txid);
  if (!r.produced || !r.produced.records) {
    return;
  }

  for (const { value: txid } of r.produced.records) {
    txid && (await waitForAll(txid));
  }

  return r;
}

async function waitForSingle(txid: TxID | URLArgs) {
  console.log(`Waiting for ${txid}`);
  for (let i = 0; i < waitLimit; i++) {
    try {
      const r = (await client.query(txid)) as MessageRecord;
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
    `Transaction still missing or pending after ${(waitTime * waitLimit) / 1000} seconds`
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
