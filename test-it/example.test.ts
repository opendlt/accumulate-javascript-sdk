/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { ED25519Key, Signer } from "../src";
import { AccountRecord, JsonRpcClient } from "../src/api_v3";
import {
  AddKeyOperation,
  CreateDataAccount,
  CreateIdentity,
  SetThresholdKeyPageOperation,
  UpdateAccountAuth,
  UpdateKeyPage,
  VoteType,
} from "../src/core";
import {
  createADIWithRandomKey,
  makeRandomLiteAccount as createRandomLiteAccount,
  sign,
  signAndSubmit,
  startSim,
  submit,
} from "./util";

// eslint-disable-next-line prefer-const
let client = new JsonRpcClient(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v3");
// client.debug = true;

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
    console.log("Set up a lite account");
    const lite = await createRandomLiteAccount(client, { credits: 32000 });

    console.log("Create an ADI");
    const keySigner = await createADIWithRandomKey(client, "example.acme", lite);

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

  test("Multi-authority", async () => {
    console.log("Set up a lite account");
    const lite = await createRandomLiteAccount(client, { credits: 1e6 });

    console.log("Create Alice and Bob");
    const alice = await createADIWithRandomKey(client, "alice.acme", lite, { credits: 1e6 });
    const bob = await createADIWithRandomKey(client, "bob.acme", lite);

    console.log("Create an owned ADI");
    await signAndSubmit(
      client,
      "alice.acme",
      new CreateIdentity({
        url: "example.acme",
        authorities: ["alice.acme/book"],
      }),
      alice.withVersion(1),
      true,
    );

    await client
      .query("example.acme")
      .then((r) => console.log((r as AccountRecord).account!.asObject()));

    console.log("Transfer example.acme to Bob");
    const { txn, sig } = await sign(
      "example.acme",
      new UpdateAccountAuth({
        operations: [
          {
            type: "addAuthority",
            authority: "bob.acme/book",
          },
          {
            type: "removeAuthority",
            authority: "alice.acme/book",
          },
        ],
      }),
      alice,
    );
    await submit(client, txn, sig, "signatures");

    const sig2 = await bob.sign(txn, {});
    await submit(client, txn, sig2, true);

    await client
      .query("example.acme")
      .then((r) => console.log((r as AccountRecord).account!.asObject()));
  });
});
