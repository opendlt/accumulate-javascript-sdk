/* eslint-disable @typescript-eslint/no-non-null-assertion */
export function fieldMarshalBinary(field: number, val: Uint8Array): Buffer {
  if (field < 1 || field > 32) {
    throw new Error(`Field number is out of range [1, 32]: ${field}`);
  }
  return Buffer.concat([uvarintMarshalBinary(field), val]);
}

export function uvarintMarshalBinary(val: number | bigint, field?: number): Buffer {
  if (typeof val === "number" && val > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      "Cannot marshal binary number greater than MAX_SAFE_INTEGER. Use bigint instead."
    );
  }

  let x = BigInt(val);
  const buffer = [];
  let i = 0;

  while (x >= 0x80) {
    buffer[i] = Number((x & 0xffn) | 0x80n);
    x >>= 7n;
    i++;
  }

  buffer[i] = Number(x & 0xffn);
  const data = Buffer.from(buffer);

  return field ? fieldMarshalBinary(field, data) : data;
}

export function varintMarshalBinary(val: number | bigint, field?: number): Buffer {
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

  const x = BigInt(val);
  let ux = x << 1n;
  if (x < 0) {
    ux = ~ux;
  }
  return uvarintMarshalBinary(ux, field);
}

export function bigNumberMarshalBinary(bn: bigint, field?: number): Buffer {
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

export function booleanMarshalBinary(b: boolean, field?: number): Buffer {
  const data = b ? Buffer.from([1]) : Buffer.from([0]);
  return withFieldNumber(data, field);
}

export function stringMarshalBinary(val: string, field?: number): Buffer {
  const data = bytesMarshalBinary(Buffer.from(val));
  return withFieldNumber(data, field);
}

export function bytesMarshalBinary(val: Uint8Array, field?: number): Buffer {
  const length = uvarintMarshalBinary(val.length);
  const data = Buffer.concat([length, val]);
  return withFieldNumber(data, field);
}

export function hashMarshalBinary(val: Uint8Array, field?: number): Buffer {
  if (val.length != 32) {
    throw new Error(`Invalid length, value is not a hash`);
  }
  const data = Buffer.from(val);
  return withFieldNumber(data, field);
}

function withFieldNumber(data: Buffer, field?: number): Buffer {
  return field ? fieldMarshalBinary(field, data) : data;
}
