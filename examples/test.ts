// You need to import the Payload class for the type of transaction you want to make.
// Here we are building a SendTokens transaction.
import { api_v3 } from "accumulate.js";

const v3 = new api_v3.JsonRpcClient("https://mainnet.accumulatenetwork.io/v3");
console.log(await v3.networkStatus());
