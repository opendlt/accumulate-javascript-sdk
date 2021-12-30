import BN from "bn.js";
import { u64 } from "./bigint";

export function uvarintMarshalBinary(val: number | u64): Buffer {
  if (typeof val === "number" && val > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      "Cannot marshal binary number greater than MAX_SAFE_INTEGER. Use `u64` class."
    );
  }

  let x = new BN(val);
  const buffer = [];
  let i = 0;

  while (x.gte(new BN(0x80))) {
    //   console.log("in");
    //   console.log(x.maskn(8).toNumber());
    buffer[i] = x.maskn(8).or(new BN(0x80)).toNumber();
    //   console.log(buffer[i]);
    x = x.shrn(7);
    //   console.log(x.toNumber());
    i++;
  }
  // console.log("out");

  buffer[i] = x.maskn(8).toNumber();
  // console.log(buffer[i]);

  return Buffer.from(buffer);
}

export function stringMarshalBinary(val: string): Buffer {
  const buffer = Buffer.from(val);
  const length = uvarintMarshalBinary(buffer.length);
  return Buffer.concat([length, buffer]);
}

export function bytesMarshalBinary(val: Uint8Array): Buffer {
    const length = uvarintMarshalBinary(val.length);
    return Buffer.concat([length, val]);
  }
