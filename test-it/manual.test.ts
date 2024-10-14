/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { JsonRpcClient } from "../src/api_v3";
import { SendTokens, TransactionBody } from "../src/core";
import { ED25519Key, Signer } from "../src/signing";
import { addCredits2, signAndSubmit, startSim, waitForAll } from "./util";

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
    let body = (await addCredits2({
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
