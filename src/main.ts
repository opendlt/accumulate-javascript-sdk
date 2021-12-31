import { Keypair } from "./keypair";
import { Client } from "./client";
import { LiteAccount } from "./lite-account";
import { AccURL } from "./acc-url";
import { Identity } from "./identity";

const sk = Buffer.from(
  "d24c73abfd99dfbc2d10f5e987b8866b0d479742ca9904713aac0fa8f59f62cd2a8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f",
  "hex"
);
const kp = Keypair.fromSecretKey(sk);
const acc = LiteAccount.generateWithKeypair(kp);
console.log(acc.url.toString());

// const nonce = new u64(Date.now());
// const si = {
//   url: acc.url,
//   nonce,
//   keyPageHeight: new u64(1),
//   keyPageIndex: new u64(0),
// };

/////////////////////////

const kp2 = Keypair.fromSeed(
  Buffer.from("2a8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f", "hex")
);
const acc2 = LiteAccount.generateWithKeypair(kp2);
const recipient = acc2.url;
console.log("Sending to " + recipient);
// const sendTokens = { to: [{ url: recipient.toString(), amount: 1000000000 }] };

/////////////////////////
// const addCredits = {
//   recipient: acc.url,
//   amount: 100,
// };
/////////////////////////

const kpIdentity = Keypair.fromSeed(
  Buffer.from("aa8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f", "hex")
);
const identity = new Identity(AccURL.parse("acc://luap4"), kpIdentity);

console.log("pk identity " + Buffer.from(identity.publicKey).toString("hex"));

console.log("Identity " + identity);
// const createIdentity = {
//   url: identity,
//   publicKey: kpIdentity.publicKey,
//   keyBookName: "luap4-book",
//   keyPageName: "luap4-page",
// };
/////////////////////////
// const createTokenAccount = {
//   url: identity.url + "/ACME",
//   tokenUrl: ACME_TOKEN_URL.toString(),
//   keyBookUrl: "acc://luap4/luap4-book",
// };

const client = new Client("http://127.0.1.1:26660/v2");

// const sendTokensToLuap = { to: [{ url: identity + "/ACME6", amount: 100000000 }] };
const sendTokensToAcc2 = { to: [{ url: acc2.url, amount: 100000000 }] };

async function run() {
  // await client.faucet(acc.url);
  // await client.queryUrl(acc.url);
  // await client.addCredits(addCredits, acc);
  // await client.sendTokens(sendTokens, acc);
  // await client.createIdentity(createIdentity, acc);
  // await client.queryTx("1bef2c537b27f9869753690588699ec00491e5fb04746f36edbbc68347ed59fa");
  // await client.createTokenAccount(createTokenAccount, identity);
  // await client.queryUrl(identity);
  await client.queryUrl(identity.toString() + "/ACME6");
  // await client.sendTokens(sendTokensToLuap, acc);
  await client.sendTokens(sendTokensToAcc2, identity);
}

run();
