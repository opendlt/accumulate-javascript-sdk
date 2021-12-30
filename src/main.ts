import { Keypair } from "./keypair";
import { Client } from "./client";
import { LiteAccount } from "./lite-account";

const sk = Buffer.from(
  "d24c73abfd99dfbc2d10f5e987b8866b0d479742ca9904713aac0fa8f59f62cd2a8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f",
  "hex"
);

const kp = Keypair.fromSecretKey(sk);

const acc = LiteAccount.generateWithKeypair(kp);
console.log(acc.getUrl().toString());

// const nonce = new u64(Date.now());
// const si = {
//   url: acc.getUrl(),
//   nonce,
//   keyPageHeight: new u64(1),
//   keyPageIndex: new u64(0),
// };

/////////////////////////

const recipient = LiteAccount.generate().getUrl();
console.log("Sending to " + recipient);

const sendTokens = {
  to: [{ url: recipient.toString(), amount: 1000000000 }],
};

/////////////////////////

const addCredits = {
  recipient: acc.getUrl(),
  amount: 100
}

/////////////////////////

const client = new Client();

client.addCredits(addCredits, acc);
client.sendTokens(sendTokens, acc);


// client.faucet(acc.getUrl());

// const params = txRequestToParams(txRequest);
// console.log(JSON.stringify(params))

// client.apiCall("execute", params);

