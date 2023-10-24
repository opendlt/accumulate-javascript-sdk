/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { TxID, URLArgs } from "../src";
import { JsonRpcClient, MessageRecord, RpcError } from "../src/api_v3";
import {
  AddCredits,
  AddCreditsArgs,
  SendTokens,
  Transaction,
  TransactionBody,
  TransactionHeader,
} from "../src/core";
import { Status } from "../src/errors";
import { Envelope, TransactionMessage } from "../src/messaging";
import { ED25519Key, Signer, SignerWithVersion } from "../src/signing";
import { startSim } from "./util";

// eslint-disable-next-line prefer-const
let client = new JsonRpcClient(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v3");

let sim: ChildProcess;
beforeAll(
  async () =>
    await startSim((proc, port) => {
      sim = proc;
      client = new JsonRpcClient(`http://127.0.1.1:${port}/v3`);
    })
);
afterAll(() => sim?.pid && treeKill(sim.pid));

describe("manually", () => {
  test("send tokens", async () => {
    // Create an LTA with tokens
    const sender = await Signer.forLite(await ED25519Key.generate());
    const subs = await client.faucet(sender.url.join("ACME"));
    await waitForAll(client, subs.status!.txID!);

    // Buy credits
    let body = (await addCredits({
      amount: 100,
      recipient: sender.url,
      oracle: (await client.networkStatus({ partition: "Directory" })).oracle!.price!,
    })) as TransactionBody;
    await signAndSubmit(client, sender.url.join("ACME"), body, sender, true);

    // Send tokens
    const recipient = await Signer.forLite(await ED25519Key.generate());
    body = new SendTokens({
      to: [
        {
          url: recipient.url.join("ACME"),
          amount: 10,
        },
      ],
    });
    await signAndSubmit(client, sender.url.join("ACME"), body, sender, true);
  });
});

async function addCredits({
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

async function signAndSubmit(
  client: JsonRpcClient,
  principal: URLArgs,
  body: TransactionBody,
  signer: SignerWithVersion,
  wait = false
) {
  const header = new TransactionHeader({ principal });
  const tx = new Transaction({ body, header });

  const sig = await signer.sign(tx, { timestamp: Date.now() });
  const env = new Envelope({ transaction: [tx], signatures: [sig] });

  const subs = await client.submit(env);
  for (const sub of subs) {
    if (sub?.status?.error) {
      throw new Error(sub.status.error.message);
    }
  }

  if (wait) {
    // Check the signatures first
    for (const sub of subs.slice(1)) {
      await waitForMsg(client, sub.status!.txID!);
    }

    // Check the transaction
    await waitForAll(client, subs[0].status!.txID!);
  }

  return subs;
}

async function waitForAll(client: JsonRpcClient, id: TxID) {
  // Wait for the transaction
  const r = await waitForMsg(client, id);
  if (!r?.produced?.records) return;

  // Wait for deposits, etc
  for (const { value: id } of r.produced.records) {
    await waitForAll(client, id!);
  }
}

async function waitForMsg(client: JsonRpcClient, id: TxID) {
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
