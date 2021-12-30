
import { Keypair } from "./keypair";
import { Client } from "./client";
import { LiteAccount } from "./lite-account";
import { u64 } from "./bigint";
import { marshalBinarySendTokens, marshalJSONSendTokens } from "./types/send-tokens";
import { transactionHash, txRequestToParams } from "./types/tx-request";


const sk = Buffer.from(
  "d24c73abfd99dfbc2d10f5e987b8866b0d479742ca9904713aac0fa8f59f62cd2a8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f",
  "hex"
);

const kp = Keypair.fromSecretKey(sk);

const acc = LiteAccount.generateWithKeypair(kp);
console.log(acc.getUrl().toString());

const recipient = LiteAccount.generate().getUrl();
console.log("Sending to " + recipient);
const sendTokens = {
  to: [{ url: recipient, amount: 10 }],
};

const sendTokensBinary = new Uint8Array(marshalBinarySendTokens(sendTokens));

console.log(JSON.stringify(sendTokens));
console.log(sendTokensBinary);

const nonce = new u64(1);
const si = {
  url: acc.getUrl(),
  nonce,
  keyPageHeight: new u64(1),
  keyPageIndex: new u64(0),
};

// console.log("privKey", acc.keypair.secretKey)
const signature = acc.sign(nonce, transactionHash(sendTokensBinary, si));

console.log("sendTokensBinary", sendTokensBinary)
console.log("transactionHash", new Uint8Array(transactionHash(sendTokensBinary, si)))
console.log("signature", signature.signature)

// console.log("-------------");
// console.log(acc.getUrl().toString())
// console.log(new Uint8Array(transactionHash(Buffer.from([1, 2, 3]), si)));
// console.log("-------------");

console.log("json payload", JSON.stringify(marshalJSONSendTokens(sendTokens)))

const txRequest = {
  checkOnly: false,
  payload: marshalJSONSendTokens(sendTokens),
  signer: {
    publicKey: signature.publicKey,
    nonce: signature.nonce,
  },
  origin: acc.getUrl(),
  keyPage: {
    height: si.keyPageHeight,
    index: si.keyPageIndex,
  },
  signature: signature.signature,
};


const client = new Client();

// client.faucet(acc.getUrl());

const sendTokensParams = txRequestToParams(txRequest);
console.log(sendTokensParams)
client.apiCall("send-tokens", sendTokensParams);

// client.apiCall("add-credits", sendTokensParams);