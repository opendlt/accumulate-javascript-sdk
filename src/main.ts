
import { Keypair } from "./keypair";
import { Client } from "./client";
import { LiteAccount } from "./lite-account";
import { u64 } from "./bigint";
// import { marshalBinarySendTokens, marshalJSONSendTokens } from "./protocol/send-tokens";
import { marshalBinaryAddCredits, marshalJSONAddCredits } from "./protocol/add-credits";
import { txRequestToParams, getTxRequest } from "./api/tx-request";
import { transactionHash } from "./api/gen-transaction";

const sk = Buffer.from(
  "d24c73abfd99dfbc2d10f5e987b8866b0d479742ca9904713aac0fa8f59f62cd2a8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f",
  "hex"
);

const kp = Keypair.fromSecretKey(sk);

const acc = LiteAccount.generateWithKeypair(kp);
console.log(acc.getUrl().toString());

const nonce = new u64(1);
const si = {
  url: acc.getUrl(),
  nonce,
  keyPageHeight: new u64(1),
  keyPageIndex: new u64(0),
};

/////////////////////////

// const recipient = LiteAccount.generate().getUrl();
// console.log("Sending to " + recipient);
// const sendTokens = {
//   to: [{ url: recipient, amount: 10 }],
// };

// const sendTokensBinary = marshalBinarySendTokens(sendTokens);

// console.log(JSON.stringify(sendTokens));
// console.log(new Uint8Array(sendTokensBinary));

// // console.log("privKey", acc.keypair.secretKey)
// const signature = acc.sign(nonce, transactionHash(sendTokensBinary, si));
// console.log("sendTokensBinary", sendTokensBinary)
// console.log("transactionHash", new Uint8Array(transactionHash(sendTokensBinary, si)))
// console.log("signature", signature.signature)
// // console.log("-------------");
// // console.log(acc.getUrl().toString())
// // console.log(new Uint8Array(transactionHash(Buffer.from([1, 2, 3]), si)));
// // console.log("-------------");
// console.log("json payload", JSON.stringify(marshalJSONSendTokens(sendTokens)))
// const txRequest = getTxRequest(acc.getUrl(), marshalJSONSendTokens(sendTokens), signature, si);

/////////////////////////

const addCredits = {
  recipient: acc.getUrl(),
  amount: 100
}

const addCreditsBinary = marshalBinaryAddCredits(addCredits);
const signature = acc.sign(nonce, transactionHash(addCreditsBinary, si));
const txRequest = getTxRequest(acc.getUrl(), marshalJSONAddCredits(addCredits), signature, si);

/////////////////////////

const client = new Client();

// client.faucet(acc.getUrl());

const params = txRequestToParams(txRequest);
console.log(params)
// client.apiCall("send-tokens", params);

client.apiCall("add-credits", params);