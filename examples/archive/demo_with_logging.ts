/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { api_v3, ED25519Key, Signer, TxID, URLArgs } from "accumulate.js";
import { MessageRecord, RpcError } from "accumulate.js/api_v3";
import { Transaction } from "accumulate.js/core";
import { Error as Error2, Status } from "accumulate.js/errors";
import * as fs from 'fs';

// Create a logging wrapper for the JSON RPC client
class LoggingJsonRpcClient extends api_v3.JsonRpcClient {
  private logFile: string;
  private requestCounter = 0;

  constructor(url: string, logFile: string) {
    super(url);
    this.logFile = logFile;

    // Initialize log file
    fs.writeFileSync(this.logFile, `=== ACCUMULATE DEMO RPC LOG - ${new Date().toISOString()} ===\n\n`);
  }

  private logRpcCall(method: string, params: any, response: any, error?: any) {
    this.requestCounter++;
    const timestamp = new Date().toISOString();

    const logEntry = {
      requestId: this.requestCounter,
      timestamp,
      method,
      request: {
        jsonrpc: "2.0",
        id: this.requestCounter,
        method,
        params
      },
      response: error ? {
        jsonrpc: "2.0",
        id: this.requestCounter,
        error
      } : {
        jsonrpc: "2.0",
        id: this.requestCounter,
        result: response
      }
    };

    const logText = `\n${'='.repeat(80)}\nREQUEST #${this.requestCounter} - ${timestamp}\n${'='.repeat(80)}\n`;
    const requestText = `REQUEST:\n${JSON.stringify(logEntry.request, null, 2)}\n\n`;
    const responseText = `RESPONSE:\n${JSON.stringify(logEntry.response, null, 2)}\n\n`;

    fs.appendFileSync(this.logFile, logText + requestText + responseText);

    console.log(`🔄 RPC Call #${this.requestCounter}: ${method}`);
    if (error) {
      console.log(`❌ Error: ${error.message || error}`);
    } else {
      console.log(`✅ Success`);
    }
  }

  async call(method: string, params: any) {
    try {
      const response = await super.call(method, params);
      this.logRpcCall(method, params, response);
      return response;
    } catch (error) {
      this.logRpcCall(method, params, null, error);
      throw error;
    }
  }
}

const logFile = 'C:\\Accumulate_Stuff\\typescript-sdk-accumulate-mod\\javascript\\examples\\demo_rpc_logs.json';
const client = new LoggingJsonRpcClient("https://kermit.accumulatenetwork.io/v3", logFile);

const waitTime = 500;
const waitLimit = 30_000 / waitTime;

async function main() {
  try {
    console.log("🚀 Starting Accumulate Demo with Full RPC Logging");
    console.log(`📝 Logging all RPC calls to: ${logFile}`);

    // Generate a random Signer (this is only local, until that account receive its first tokens)
    const lid = Signer.forLite(ED25519Key.generate());
    const lta = lid.url.join("ACME");
    console.log(`💳 Generated Lite Token Account: ${lta.toString()}`);

    // Request some ACME token to get started from the faucet
    console.log("🚰 Requesting tokens from faucet...");
    let res = [await client.faucet(lta)];
    await waitForAll(res[0].status!.txID!);

    // Check the ACME token balance
    console.log("💰 Checking ACME token balance...");
    console.log(await client.query(lta));

    // 1000 credits * credit precision (10^2) / (credits per acme) * acme precision (10^8)
    console.log("🔍 Getting network status...");
    const { oracle } = await client.networkStatus();
    const acmeAmount = ((1000 * 10 ** 2) / oracle!.price!) * 10 ** 8;

    // Convert some tokens into credits necessary to perform operations on Accumulate
    console.log("🔄 Converting tokens to credits...");
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
    console.log("💳 Checking credits balance...");
    console.log(await client.query(lid.url));

    // Now with the credits we can create an Accumulate Digital Identifier (ADI)
    // which is one of the fundamental feature of the network

    const identitySigner = ED25519Key.generate(); // Root signer that will control the identity
    // Create dynamic ADI name with timestamp (only allowed characters: letters, numbers, hyphens)
    const timestamp = Date.now().toString();
    const identityUrl = `acc://test-adi-${timestamp}.acme`;
    const bookUrl = identityUrl + "/book";

    console.log(`🆔 Creating ADI with dynamic name: ${identityUrl}`);

    console.log("🆔 Creating Accumulate Digital Identifier (ADI)...");
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
    console.log("🔍 Checking created identity...");
    console.log(await client.query(identityUrl));

    console.log("✅ Demo completed successfully!");

  } catch (error) {
    console.error("❌ Demo failed:", error);
    fs.appendFileSync(logFile, `\n\nERROR: ${error}\n`);
  }
}

async function waitForAll(txid: TxID | URLArgs) {
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

async function waitForSingle(txid: TxID | URLArgs) {
  console.log(`⏳ Waiting for ${txid}`);
  for (let i = 0; i < waitLimit; i++) {
    try {
      const r = (await client.query(txid)) as MessageRecord;
      if (r.status === Status.Delivered) {
        console.log(`✅ Transaction completed: ${txid}`);
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

main().catch(console.error);