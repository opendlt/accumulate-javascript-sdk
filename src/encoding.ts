import BN from "bn.js";

export function arrayMarshalBinary<T>(val: T[], marshal: (val: T) => Buffer): Buffer {
  const forConcat = [];

  forConcat.push(uvarintMarshalBinary(val.length));
  val.forEach((val) => forConcat.push(marshal(val)));
  return Buffer.concat(forConcat);
}

export function uvarintMarshalBinary(val: number | BN): Buffer {
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

  return Buffer.from(buffer);
}

export function bigNumberMarshalBinary(bn?: BN): Buffer {
  return bytesMarshalBinary(bn ? bn.toArrayLike(Buffer, "be") : Buffer.allocUnsafe(0));
}

export function booleanMarshalBinary(b?: boolean): Buffer {
  return b ? Buffer.from([1]) : Buffer.from([0]);
}

export function stringMarshalBinary(val?: string): Buffer {
  if (!val) {
    return Buffer.from([0]);
  }

  return bytesMarshalBinary(Buffer.from(val));
}

export function bytesMarshalBinary(val: Uint8Array): Buffer {
  const length = uvarintMarshalBinary(val.length);
  return Buffer.concat([length, val]);
}

export function hashMarshalBinary(val: Uint8Array): Buffer {
  if (val.length != 32) {
    throw new Error(`Invalid length, value is not a hash`);
  }
  return Buffer.from(val);
}
