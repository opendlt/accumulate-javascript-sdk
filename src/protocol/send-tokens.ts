import { AccURL } from "../acc-url";
import { TxType } from "../tx-types";
import {
  uvarintMarshalBinary,
  stringMarshalBinary,
  bytesMarshalBinary,
} from "../encoding";
import { u64 } from "../bigint";

export type TokenRecipient = {
  url: string | AccURL;
  amount: number | u64;
};

export type SendTokens = {
  hash?: Uint8Array;
  meta?: Uint8Array;
  to: TokenRecipient[];
};

export function marshalBinarySendTokens(st: SendTokens): Buffer {
  const hash = st.hash || Buffer.alloc(32, 0);
  validateHash(hash);
  if (st.to.length < 1) {
    throw new Error("Missing at least one recipient");
  }

  const forConcat = [];

  forConcat.push(uvarintMarshalBinary(TxType.SendTokens));
  forConcat.push(hash);
  forConcat.push(bytesMarshalBinary(st.meta || Buffer.allocUnsafe(0)));
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

export function marshalJSONSendTokens(st: SendTokens): any {
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
