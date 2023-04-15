import BN from "bn.js";

export function fieldMarshalBinary(field: number, val: Uint8Array): Buffer {
  if (field < 1 || field > 32) {
    throw new Error(`Field number is out of range [1, 32]: ${field}`);
  }
  return Buffer.concat([uvarintMarshalBinary(field), val]);
}

export function uvarintMarshalBinary(val: number | BN, field?: number): Buffer {
  if (typeof val === "number" && val > Number.MAX_SAFE_INTEGER) {
    throw new Error(
      "Cannot marshal binary number greater than MAX_SAFE_INTEGER. Use `BN` class instead."
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
  const data = Buffer.from(buffer);

  return field ? fieldMarshalBinary(field, data) : data;
}

export function varintMarshalBinary(val: number | BN, field?: number): Buffer {
  const x = new BN(val);

  let ux = x.toTwos(64).shln(1);

  if (x.isNeg()) {
    ux = ux.notn(64);
  }

  return uvarintMarshalBinary(ux, field);
}

export function bigNumberMarshalBinary(bn: BN, field?: number): Buffer {
  const data = bytesMarshalBinary(bn.toArrayLike(Buffer, "be"));
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
