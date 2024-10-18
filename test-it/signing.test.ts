/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { Client } from "../src/api_v2";
import { SignatureType, Transaction } from "../src/core";
import { Envelope } from "../src/messaging";
import { ED25519Key, RCD1Key, Signer } from "../src/signing";
import { addCredits, startSim } from "./util";

let client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");

let sim: ChildProcess;
beforeAll(
  async () =>
    await startSim((proc, port) => {
      sim = proc;
      client = new Client(`http://127.0.1.1:${port}/v2`);
    }),
);
afterAll(() => sim?.pid && treeKill(sim.pid));

describe("Test signing schemes", () => {
  test("should sign transaction using RCD1 hash", async () => {
    const lite = await Signer.forLite(await RCD1Key.generate());

    expect(lite.key.address.type).toStrictEqual(SignatureType.RCD1);

    // Get some ACME
    const res = await client.faucet(lite.url.join("ACME"));
    if (
      (res.transactionHash as any) !==
      "0100000000000000000000000000000000000000000000000000000000000000"
    )
      await client.waitOnTx(res.txid!.toString(), { timeout: 5000 });
    const { data } = await client.queryUrl(lite.url.join("ACME"));
    expect(data.type).toStrictEqual("liteTokenAccount");

    // Get some credits
    await addCredits(client, lite.url, 10_000, lite);
  });

  test("should sign transaction using ED25519 hash", async () => {
    const lite = await Signer.forLite(await ED25519Key.generate());

    expect(lite.key.address.type).toStrictEqual(SignatureType.ED25519);

    // Get some ACME
    const res = await client.faucet(lite.url.join("ACME"));
    if (
      (res.transactionHash as any) !==
      "0100000000000000000000000000000000000000000000000000000000000000"
    )
      await client.waitOnTx(res.txid!.toString(), { timeout: 5000 });
    const { data } = await client.queryUrl(lite.url.join("ACME"));
    expect(data.type).toStrictEqual("liteTokenAccount");

    // Get some credits
    await addCredits(client, lite.url, 10_000, lite);
  });
});

describe("Multisig", () => {
  test("should sign an existing transaction", async () => {
    const lite = await Signer.forLite(await ED25519Key.generate());

    // Get some ACME
    const res = await client.faucet(lite.url.join("ACME"));
    if (
      (res.transactionHash as any) !==
      "0100000000000000000000000000000000000000000000000000000000000000"
    )
      await client.waitOnTx(res.txid!.toString(), { timeout: 5000 });
    const { data } = await client.queryUrl(lite.url.join("ACME"));
    expect(data.type).toStrictEqual("liteTokenAccount");

    // Get some credits
    const txid = await addCredits(client, lite.url, 10_000, lite);

    const tx = await client.queryTx(txid);
    const transaction = new Transaction(tx.transaction);
    const sig = await lite.sign(transaction, {});
    console.log("sending envelope");
    const env = new Envelope({ transaction: [transaction], signatures: [sig] });
    const result = await client.execute(env);
    console.log(JSON.stringify(result, null, 2));
  });
});
