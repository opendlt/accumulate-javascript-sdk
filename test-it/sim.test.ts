/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { Client } from "../src";
import { startSim } from "./util";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");

let sim: ChildProcess;
beforeAll(async () => await startSim((p) => (sim = p)));
afterAll(() => sim?.pid && treeKill(sim.pid));

describe("Basic client test", () => {
  test("describe", async () => {
    const res = await client.describe();
    console.log(res.network?.id);
  });
});
