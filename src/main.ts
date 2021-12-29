import axios from "axios";

import { Keypair } from "./keypair";
import { LiteAccount } from "./lite-account";
import { AccURL } from "./acc-url";
import { TxType } from "./tx-types";
import { uvarintMarshalBinary, stringMarshalBinary } from "./encoding";
import { u64 } from "./bigint";
import { sha256 } from "./crypto";

const ENDPOINT = "https://testnet.accumulatenetwork.io/v2";

const sk = Buffer.from(
  "d24c73abfd99dfbc2d10f5e987b8866b0d479742ca9904713aac0fa8f59f62cd2a8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f",
  "hex"
);

const kp = Keypair.fromSecretKey(sk);

const acc = LiteAccount.generateWithKeypair(kp);
console.log(acc.getUrl().toString());

export type TokenRecipient = {
  url: string | AccURL;
  amount: number | u64;
};

export type SendTokens = {
  hash?: Uint8Array;
  meta?: Uint8Array;
  to: TokenRecipient[];
};

function marshalBinarySendTokens(st: SendTokens): Buffer {
  const hash = st.hash || Buffer.alloc(32, 0);
  validateHash(hash);
  if (st.to.length < 1) {
    throw new Error("Missing at least one recipient");
  }

  const forConcat = [];

  forConcat.push(uvarintMarshalBinary(TxType.SendTokens));
  forConcat.push(hash);
  forConcat.push(st.meta || Buffer.allocUnsafe(0));
  forConcat.push(uvarintMarshalBinary(st.to.length));

  st.to.forEach((recipient) =>
    forConcat.push(marshalBinaryTokenRecipient(recipient))
  );

  return Buffer.concat(forConcat);
}

function marshalBinaryTokenRecipient(tr: TokenRecipient): Buffer {
  return Buffer.concat([
    stringMarshalBinary(tr.url.toString()),
    uvarintMarshalBinary(tr.amount),
  ]);
}

function marshalJSONSendTokens(st: SendTokens): any {
  const obj = {
    hash: st.hash
      ? Buffer.from(st.hash).toString("hex")
      : Buffer.alloc(32, 0).toString("hex"),
    meta: st.meta ? Buffer.from(st.meta).toString("base64") : undefined,
    to: st.to.map((recipient) => ({
      url: recipient.url.toString(),
      // TODO: to number
      amount: new u64(recipient.amount).toNumber(),
    })),
  };

  return obj;
}

function validateHash(bytes: Uint8Array) {
  if (bytes.length !== 32) {
    throw new Error("Invalid hash length");
  }
}

const recipient = LiteAccount.generate().getUrl();
console.log("Sending to " + recipient);
const sendTokens = {
  to: [{ url: recipient, amount: 10 }],
};

const sendTokensBinary = new Uint8Array(marshalBinarySendTokens(sendTokens));

console.log(JSON.stringify(sendTokens));
console.log(sendTokensBinary);

export type Signer = {
  publicKey: Uint8Array;
  nonce: u64;
};

export type KeyPage = {
  height: u64;
  index: u64;
};

export type TxRequest = {
  checkOnly?: boolean;
  origin: AccURL;
  signer: Signer;
  signature: Uint8Array;
  keyPage: KeyPage;
  payload: string;
};

function txRequestToParams(txr: TxRequest): any {
  return {
    checkOnly: txr.checkOnly || false,
    origin: txr.origin.toString(),
    sponsor: txr.origin.toString(),
    signer: {
      publicKey: Buffer.from(txr.signer.publicKey).toString("hex"),
      // TODO toNumber
      nonce: txr.signer.nonce.toNumber(),
    },
    signature: Buffer.from(txr.signature).toString("hex"),
    keyPage: {
      // TODO toNumber
      height: txr.keyPage.height.toNumber(),
      index: txr.keyPage.index.toNumber(),
    },
    payload: txr.payload,
  };
}

export type SignatureInfo = {
  url: AccURL;
  nonce: u64;
  keyPageHeight: u64;
  keyPageIndex: u64;
};

function marshalSignatureInfo(si: SignatureInfo): Buffer {
  // console.log("~~~~~~~~~~~~~~~~~");
  // console.log(new Uint8Array(stringMarshalBinary(si.url.toString())));
  // console.log(new Uint8Array(uvarintMarshalBinary(si.nonce)));
  // console.log(new Uint8Array(uvarintMarshalBinary(si.keyPageHeight)));
  // console.log(new Uint8Array(uvarintMarshalBinary(si.keyPageIndex)));
  // console.log("~~~~~~~~~~~~~~~~~");
  return Buffer.concat([
    stringMarshalBinary(si.url.toString()),
    uvarintMarshalBinary(si.nonce),
    uvarintMarshalBinary(si.keyPageHeight),
    uvarintMarshalBinary(new u64(0)),
    uvarintMarshalBinary(si.keyPageIndex),
  ]);
}

function transactionHash(payload: Uint8Array, si: SignatureInfo): Buffer {
  // console.log("transactionHash")
  // console.log(new Uint8Array(marshalSignatureInfo(si)));
  const sHash = sha256(marshalSignatureInfo(si));
  // console.log("sHash", new Uint8Array(sHash));
  const tHash = sha256(payload);
  // console.log("tHash", new Uint8Array(tHash));
  return sha256(Buffer.concat([sHash, tHash]));
}

const nonce = new u64(353543544);
const si = {
  url: acc.getUrl(),
  nonce,
  keyPageHeight: new u64(1),
  keyPageIndex: new u64(0),
};

// console.log("privKey", acc.keypair.secretKey)
const signature = acc.sign(nonce, transactionHash(sendTokensBinary, si));


console.log("transactionHash", transactionHash(sendTokensBinary, si))
console.log("signature", signature)

// console.log("-------------");
// console.log(acc.getUrl().toString())
// console.log(new Uint8Array(transactionHash(Buffer.from([1, 2, 3]), si)));
// console.log("-------------");

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

const method = "send-tokens";
const params = txRequestToParams(txRequest);
const data = {
  jsonrpc: "2.0",
  id: 0,
  method: method,
  params: params,
};

console.log(JSON.stringify(params, null, 4));

axios
  .post(ENDPOINT, data)
  .then((r) => {
    const { error, result } = r.data;
    if (error) {
      console.error(error);
    } else {
      console.log(result);
    }
  })
  .catch((error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log("Error", error.message);
    }
  });
