import BN from "bn.js";
import { u64 } from "./bigint";

export function uvarintMarshalBinary(val: number | u64): Buffer {
  if (typeof val === "number" && val > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      "Cannot marshal binary number greater than MAX_SAFE_INTEGER. Use `u64` class instead."
    );
  }

  let x = new BN(val);
  const buffer = [];
  let i = 0;

  while (x.gte(new BN(0x80))) {
    buffer[i] = x.maskn(8).or(new BN(0x80)).toNumber();
    x = x.shrn(7);
    i++;
  }

  buffer[i] = x.maskn(8).toNumber();

  return Buffer.from(buffer);
}

export function stringMarshalBinary(val?: string): Buffer {
  if (!val) {
    return Buffer.allocUnsafe(0);
  }

  return bytesMarshalBinary(Buffer.from(val));
}

export function bytesMarshalBinary(val: Uint8Array): Buffer {
  const length = uvarintMarshalBinary(val.length);
  return Buffer.concat([length, val]);
}
