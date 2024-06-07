/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Buffer } from "../common/buffer";

/* eslint-disable @typescript-eslint/no-non-null-assertion */
export function fieldMarshalBinary(field: number, val: Uint8Array): Uint8Array {
  if (field < 1 || field > 32) {
    throw new Error(`Field number is out of range [1, 32]: ${field}`);
  }
  return Buffer.concat([uvarintMarshalBinary(field), val]);
}

export function uvarintMarshalBinary(val: number | bigint, field?: number): Uint8Array {
  if (typeof val === "number" && val > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      "Cannot marshal binary number greater than MAX_SAFE_INTEGER. Use bigint instead."
    );
  }

  let x = BigInt(val);
  const buffer = [];
  let i = 0;

  while (x >= 0x80) {
    // @ts-ignore
    buffer[i] = Number((x & 0xffn) | 0x80n); // @ts-ignore
    x >>= 7n;
    i++;
  }

  // @ts-ignore
  buffer[i] = Number(x & 0xffn);
  const data = Uint8Array.from(buffer);

  return field ? fieldMarshalBinary(field, data) : data;
}

export function varintMarshalBinary(val: number | bigint, field?: number): Uint8Array {
  if (typeof val === "number") {
    if (val > Number.MAX_SAFE_INTEGER) {
      throw new Error(
        "Cannot marshal binary number greater than MAX_SAFE_INTEGER. Use bigint instead."
      );
    }
    if (val < Number.MIN_SAFE_INTEGER) {
      throw new Error(
        "Cannot marshal binary number less than MIN_SAFE_INTEGER. Use bigint instead."
      );
    }
  }

  const x = BigInt(val); // @ts-ignore
  let ux = x << 1n;
  if (x < 0) {
    ux = ~ux;
  }
  return uvarintMarshalBinary(ux, field);
}

export function bigNumberMarshalBinary(bn: bigint, field?: number): Uint8Array {
  // @ts-ignore
  if (bn < 0n) {
    throw new Error("Cannot marshal a negative bigint");
  }
  let s = bn.toString(16);
  if (s.length % 2 == 1) {
    s = "0" + s;
  }
  const data = bytesMarshalBinary(Uint8Array.from(s.match(/../g)!.map((x) => parseInt(x, 16))));
  return withFieldNumber(data, field);
}

export function booleanMarshalBinary(b: boolean, field?: number): Uint8Array {
  const data = b ? Uint8Array.from([1]) : Uint8Array.from([0]);
  return withFieldNumber(data, field);
}

export function stringMarshalBinary(val: string, field?: number): Uint8Array {
  const data = bytesMarshalBinary(Buffer.from(val));
  return withFieldNumber(data, field);
}

export function bytesMarshalBinary(val: Uint8Array, field?: number): Uint8Array {
  if (!val) val = new Uint8Array();
  const length = uvarintMarshalBinary(val?.length);
  const data = Buffer.concat([length, val]);
  return withFieldNumber(data, field);
}

export function hashMarshalBinary(val: Uint8Array, field?: number): Uint8Array {
  if (val.length != 32) {
    throw new Error(`Invalid length, value is not a hash`);
  }
  return withFieldNumber(val, field);
}

function withFieldNumber(data: Uint8Array, field?: number): Uint8Array {
  return field ? fieldMarshalBinary(field, data) : data;
}
