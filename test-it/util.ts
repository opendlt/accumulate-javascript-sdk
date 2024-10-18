/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess, spawn } from "child_process";
import { createServer } from "net";
import path from "path";
import { randomBytes } from "tweetnacl";
import { TxID, URL, URLArgs } from "../src";
import { Client, RpcError } from "../src/api_v2";
import { JsonRpcClient, MessageRecord, Submission, TxIDRecord } from "../src/api_v3";
import { Buffer } from "../src/common/buffer";
import {
  AddCredits,
  AddCreditsArgs,
  Signature,
  Transaction,
  TransactionBody,
  TransactionHeader,
  TransactionStatus,
  VoteType,
} from "../src/core";
import { Status } from "../src/errors";
import { TransactionMessage } from "../src/messaging";
import { ED25519Key, Signer, SignerWithVersion } from "../src/signing";

export async function randomLiteIdentity(): Promise<SignerWithVersion> {
  return Signer.forLite(await ED25519Key.generate());
}

export function randomBuffer(length = 12) {
  return Buffer.from(randomBytes(length));
}

export function randomString(length = 6) {
  return randomBuffer(length * 2).toString("hex");
}

export async function addCredits(
  client: Client,
  recipient: URL | string,
  creditAmount: number,
  signer: SignerWithVersion,
) {
  let res = await client.queryUrl(recipient);
  const originalBalance = BigInt(res.data.creditBalance || 0);
  const oracle = await client.queryAcmeOracle();
  const addCredits = {
    recipient,
    amount: (creditAmount * 1e8) / oracle,
    oracle,
  };
  res = await client.addCredits(signer.url.join("ACME"), addCredits, signer);
  await client.waitOnTx(res.txid);

  res = await client.queryUrl(recipient);
  expect(BigInt(res.data.creditBalance)).toStrictEqual(originalBalance + BigInt(creditAmount));

  return res.txid;
}

export async function startSim(fn: (proc: ChildProcess, port: number) => void) {
  // Only start the simulator if the caller does not specify an API endpoint
  if (process.env.ACC_ENDPOINT) return;

  const port = await getPortFree();
  const proc = spawn(
    "go",
    [
      "run",
      "-tags=testnet",
      "./tools/cmd/simulator",
      "--step=10ms",
      `--port=${port}`,
      "--log=error;sim=info;executor=info",
      "--log-format=json",
    ],
    { cwd: path.join(__dirname, "..", "accumulate") },
  );

  return new Promise<void>((resolve, reject) => {
    let out = "";
    let stdfn: (c: Buffer) => void;
    let errfn: (code: number | null, signal: NodeJS.Signals | null) => void;

    // eslint-disable-next-line prefer-const
    stdfn = (c: Buffer) => {
      const s = c.toString("utf-8");
      console.log(s);
      out += s;
      const i = out.indexOf("\n");
      if (i < 0) return;
      const msg = JSON.parse(out.substring(0, i));
      out = out.substring(i + 1);
      if (msg.module === "sim" && msg.message === "Node HTTP up") {
        setTimeout(() => resolve(), 10);
      }
    };

    // eslint-disable-next-line prefer-const
    errfn = (code, signal) => {
      proc.off("exit", errfn);
      proc.stdout!.off("data", stdfn);
      proc.stderr!.off("data", stdfn);
      proc.stdout!.destroy();
      proc.stderr!.destroy();

      if (signal) {
        reject(new Error(`Stopped with signal ${signal}`));
      } else if (code) {
        reject(new Error(`Exited with code ${code}`));
      }
    };

    proc.on("exit", errfn);
    proc.stdout!.on("data", stdfn);
    proc.stderr!.on("data", stdfn);
    fn(proc, port + 4); // Accumulate API offset
  });
}

// Credit to https://stackoverflow.com/a/71178451/762175
async function getPortFree(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, () => {
      const port = (srv as any).address().port;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

export async function addCredits2({
  amount,
  oracle,
  ...args
}: AddCreditsArgs & { amount: number; oracle: number }) {
  // Do the math to convert a number of credits to a number of ACME for the
  // given oracle value
  const oraclePrecision = 1e2;
  const acmePrecision = 1e8;
  return new AddCredits({
    amount: (amount / (oracle / oraclePrecision)) * acmePrecision,
    oracle,
    ...args,
  });
}

export async function sign(
  principal: URLArgs,
  body: TransactionBody,
  signer: SignerWithVersion,
  vote: VoteType = VoteType.Accept,
) {
  const header = new TransactionHeader({ principal });
  const txn = new Transaction({ body, header });
  const sig = await signer.sign(txn, { timestamp: Date.now(), vote });
  return { txn, sig };
}

export async function signAndSubmit(
  client: JsonRpcClient,
  principal: URLArgs,
  body: TransactionBody,
  signer: SignerWithVersion,
  wait: boolean | "signatures" = false,
) {
  const { txn, sig } = await sign(principal, body, signer);
  return await submit(client, txn, sig, wait);
}

export async function submit(
  client: JsonRpcClient,
  txn: Transaction,
  sig: Signature,
  wait: boolean | "signatures" = false,
) {
  const subs = await client.submit({ transaction: [txn], signatures: [sig] });
  for (const sub of subs) {
    if (sub?.status?.error) {
      throw new Error(sub.status.error.message);
    }
  }

  // Check the signatures first
  if (wait === true || wait === "signatures") {
    for (const sub of subs.slice(1)) {
      await waitForMsg(client, sub.status!.txID!);
    }
  }

  // Check the transaction
  if (wait === true) {
    await waitForAll(client, subs[0].status!.txID!);
  }

  return subs;
}

export async function waitForAll(client: JsonRpcClient, id: TxID | TransactionStatus | Submission) {
  if (id instanceof Submission) {
    id.status && (await waitForAll(client, id.status));
    return;
  }

  if (id instanceof TransactionStatus) {
    id.txID && (await waitForAll(client, id.txID));
    return;
  }

  // Wait for the transaction
  const r = await waitForMsg(client, id);
  if (!r?.produced?.records) return;

  // Wait for deposits, etc
  for (const { value: id } of r.produced.records.filter((x): x is TxIDRecord => !!x)) {
    await waitForAll(client, id!);
  }
}

export async function waitForMsg(client: JsonRpcClient, id: TxID) {
  if (
    Buffer.from(id.hash).toString("hex") ==
    "0100000000000000000000000000000000000000000000000000000000000000"
  ) {
    // This is a fake faucet transaction from the simulator, there's nothing to
    // wait for
    return;
  }

  console.log(`Waiting for ${id}`);
  for (let i = 0; i < 30; i++) {
    let res: MessageRecord<TransactionMessage>;
    try {
      res = (await client.query(id)) as MessageRecord<TransactionMessage>;
    } catch (error) {
      if (!(error instanceof RpcError)) throw error;
      if (error.data?.code !== "notFound") throw error;
      // Not found, wait 1 second
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    if (res.status == Status.Delivered) {
      console.log("Message completed");
      return res;
    }

    if (res.status! >= 400) {
      throw new Error(`Message failed: ${res.error!.message}`);
    }

    // Pending, wait 1 second
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${id} not completed within 30s`);
}
