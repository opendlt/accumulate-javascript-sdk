// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { api_v3 } from "accumulate.js";
import { AccumulateDataEntry } from "accumulate.js/core";

const mainnet = new api_v3.JsonRpcClient("https://mainnet.accumulatenetwork.io/v3");
console.log(await mainnet.networkStatus());

const kermit = new api_v3.JsonRpcClient("https://kermit.accumulatenetwork.io/v3");
const r = await kermit.query("ethan.acme/data", { queryType: "chain", name: "main", range: {} });
console.log(r.asObject());

const x = new AccumulateDataEntry({ data: ["", "deadbeef"] });
console.log(Buffer.from(x.hash()).toString("hex"));
