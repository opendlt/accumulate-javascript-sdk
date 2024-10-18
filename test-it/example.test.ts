/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { ED25519Key, Signer } from "../src";
import { JsonRpcClient } from "../src/api_v3";
import {
  AddKeyOperation,
  CreateDataAccount,
  CreateIdentity,
  SetThresholdKeyPageOperation,
  UpdateKeyPage,
  VoteType,
} from "../src/core";
import {
  addCredits2,
  randomLiteIdentity,
  sign,
  signAndSubmit,
  startSim,
  submit,
  waitForAll,
} from "./util";

// eslint-disable-next-line prefer-const
let client = new JsonRpcClient(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v3");

let sim: ChildProcess;
beforeAll(
  async () =>
    await startSim((proc, port) => {
      sim = proc;
      client = new JsonRpcClient(`http://127.0.1.1:${port}/v3`);
    }),
);
afterAll(() => sim?.pid && treeKill(sim.pid));

describe("Example usage:", () => {
  test("Multisig", async () => {
    client.debug = true;

    const { oracle } = await client.networkStatus({ partition: "Directory" });

    console.log("Set up a lite account");
    const lite = await randomLiteIdentity();
    await waitForAll(client, await client.faucet(lite.url.join("ACME")));

    await signAndSubmit(
      client,
      lite.url.join("ACME"),
      await addCredits2({
        amount: 32000,
        recipient: lite.url,
        oracle: oracle!.price!,
      }),
      lite,
      true,
    );

    console.log("Create an ADI");
    const keySigner = Signer.forPage("example.acme/book/1", ED25519Key.generate());
    await signAndSubmit(
      client,
      lite.url.join("ACME"),
      new CreateIdentity({
        url: "example.acme",
        keyBookUrl: "example.acme/book",
        keyHash: keySigner.key.address.publicKeyHash,
      }),
      lite,
      true,
    );

    await signAndSubmit(
      client,
      lite.url.join("ACME"),
      await addCredits2({
        amount: 10000,
        recipient: "example.acme/book/1",
        oracle: oracle!.price!,
      }),
      lite,
      true,
    );

    console.log("Add another key and set M=2");
    const otherSigner = Signer.forPage(keySigner.url, ED25519Key.generate());
    await signAndSubmit(
      client,
      "example.acme/book/1",
      new UpdateKeyPage({
        operation: [
          new AddKeyOperation({
            entry: {
              keyHash: otherSigner.key.address.publicKeyHash,
            },
          }),
          new SetThresholdKeyPageOperation({
            threshold: 2,
          }),
        ],
      }),
      keySigner.withVersion(1),
      true,
    );

    console.log("Do something else");
    const { txn, sig } = await sign(
      "example.acme",
      new CreateDataAccount({
        url: "example.acme/data",
      }),
      keySigner.withVersion(2),
      VoteType.Reject,
    );
    await submit(client, txn, sig, "signatures");

    const sig2 = await otherSigner.sign(txn, { signerVersion: 2, timestamp: Date.now() });
    await submit(client, txn, sig2, true);
  });
});
