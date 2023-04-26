/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { Client } from "../src/api_v2";
import { SendTokens, Transaction, TransactionHeader } from "../src/core";
import { Envelope } from "../src/messaging";
import { LiteSigner, signTransaction } from "../src/signing";
import { addCredits, randomLiteIdentity, startSim } from "./util";

let client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");
let lid: LiteSigner;

let sim: ChildProcess;
beforeAll(
  async () =>
    await startSim((proc, port) => {
      sim = proc;
      client = new Client(`http://127.0.1.1:${port}/v2`);
    })
);
afterAll(() => sim?.pid && treeKill(sim.pid));

describe("Test manual transactions", () => {
  beforeAll(async () => {
    lid = await randomLiteIdentity();

    // Get some ACME
    const res = await client.faucet(lid.acmeTokenAccount);
    await client.waitOnTx(res.txid!.toString());

    // Get some credits
    await addCredits(client, lid.url, 10_000, lid);
  });

  test("should send tokens with manual transaction", async () => {
    const recipient = (await randomLiteIdentity()).acmeTokenAccount;
    const amount = 1025n;
    const payload = new SendTokens({ to: [{ url: recipient, amount: amount }] });
    const header = new TransactionHeader({ principal: lid.acmeTokenAccount });

    const tx = new Transaction({ body: payload, header });
    const env = await signTransaction(tx, lid, { timestamp: Date.now() });

    const res = await client.execute(env);
    await client.waitOnTx(res.txid!.toString());

    const { data } = await client.queryUrl(recipient);
    expect(BigInt(data.balance)).toStrictEqual(amount);
  });

  test.skip("should reject unsigned transaction", async () => {
    const recipient = (await randomLiteIdentity()).acmeTokenAccount;
    const amount = 50;
    const payload = new SendTokens({ to: [{ url: recipient, amount: amount }] });
    const header = new TransactionHeader({ principal: lid.url });

    const tx = new Transaction({ body: payload, header });

    expect(() => client.execute(new Envelope({ transaction: [tx] }))).toThrowError(
      /unsigned transaction/i
    );
  });
});
