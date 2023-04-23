/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { api_v3, Client } from "../src";
import { startSim } from "./util";

const client2 = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");
const client3 = new api_v3.JsonRpcClient(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v3");

let sim: ChildProcess;
beforeAll(async () => await startSim((p) => (sim = p)));
afterAll(() => sim?.pid && treeKill(sim.pid));

describe("API v2", () => {
  test("describe", async () => {
    const res = await client2.describe();
    console.log(res.network?.id);
  });
});

describe("API v3 JSON-RPC", () => {
  test("query dn.acme", async () => {
    const res = await client3.query("dn.acme");
    console.log(JSON.stringify(res.asObject(), null, "  "));
  });
});
