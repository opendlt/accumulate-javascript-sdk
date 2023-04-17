/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { Client } from "../src";
import { SignatureType } from "../src/core";
import { LiteSigner, RCD1KeypairSigner } from "../src/signing";
import { addCredits, startSim } from "./util";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");

let sim: ChildProcess;
beforeAll(async () => await startSim((p) => (sim = p)));
afterAll(() => sim?.pid && treeKill(sim.pid));

describe("Test signing schemes", () => {
  test("should sign transaction using RCD1 hash", async () => {
    const rcd1Account = await LiteSigner.from(RCD1KeypairSigner.generate());

    expect(rcd1Account.info.type).toStrictEqual(SignatureType.RCD1);

    // Get some ACME
    const res = await client.faucet(rcd1Account.acmeTokenAccount);
    await client.waitOnTx(res.txid!.toString(), { timeout: 5000 });
    const { data } = await client.queryUrl(rcd1Account.acmeTokenAccount);
    expect(data.type).toStrictEqual("liteTokenAccount");

    // Get some credits
    await addCredits(client, rcd1Account.url, 10_000, rcd1Account);
  });
});
