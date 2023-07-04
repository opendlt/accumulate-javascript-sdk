import { consume, Consumer, encode } from ".";
import * as url from "../address";
import { Buffer } from "../common/buffer";
import {
  bigNumberMarshalBinary as bigIntMarshalBinary,
  booleanMarshalBinary,
  bytesMarshalBinary,
  hashMarshalBinary,
  stringMarshalBinary,
  uvarintMarshalBinary as uintMarshalBinary,
  uvarintMarshalBinary,
  varintMarshalBinary as intMarshalBinary,
} from "./encoding";

export interface Encodable {
  embedding?: boolean;
  encode(value: any): Uint8Array;
  consume?(value: any, consumer: Consumer): void;
  raw?(value: any): { length: Uint8Array; value: Uint8Array };
}

export class Int {
  encode(value: number) {
    return intMarshalBinary(value);
  }
}

export class Uint {
  encode(value: number) {
    return uintMarshalBinary(value);
  }
}

export class Bool {
  encode(value: boolean) {
    return booleanMarshalBinary(value);
  }
}

export class String {
  encode(value: string) {
    return stringMarshalBinary(value);
  }
  raw(value: string) {
    return Bytes.raw(Buffer.from(value, "utf-8"));
  }
}

export class Hash {
  encode(value: Uint8Array) {
    return hashMarshalBinary(value);
  }
}

export class Bytes {
  encode(value: Uint8Array) {
    return bytesMarshalBinary(value);
  }
  raw(value: Uint8Array) {
    return Bytes.raw(value);
  }

  static raw(value: Uint8Array) {
    const length = uvarintMarshalBinary(value.length);
    return { length, value: Buffer.from(value) };
  }
}

export class Url {
  encode(value: url.URL) {
    return stringMarshalBinary(value.toString());
  }
  raw(value: url.URL) {
    return Bytes.raw(Buffer.from(value.toString(), "utf-8"));
  }
}

export class Time {
  encode(value: Date) {
    return uintMarshalBinary(value.getTime() / 1000);
  }
}

export class Duration {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  encode(_value: number): Uint8Array {
    throw new Error("cannot marshal duration to binary");
  }
}

export class BigInt {
  encode(value: bigint) {
    return bigIntMarshalBinary(value);
  }
}

export class Float {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  encode(_value: number): Uint8Array {
    throw new Error("cannot marshal float to binary");
  }
}

export class TxID {
  encode(value: url.TxID) {
    return stringMarshalBinary(value.toString());
  }
  raw(value: url.TxID) {
    return Bytes.raw(Buffer.from(value.toString(), "utf-8"));
  }
}

export class Enum {
  encode(value: number) {
    return uintMarshalBinary(value);
  }
}

export class Union {
  composite = true;
  encode(value: any) {
    return bytesMarshalBinary(encode(value));
  }
  consume(value: any, consumer: Consumer) {
    consume(value, consumer);
  }
}

export class Reference {
  composite = true;
  encode(value: any) {
    return bytesMarshalBinary(encode(value));
  }
  consume(value: any, consumer: Consumer) {
    consume(value, consumer);
  }
}

export class RawJson {
  encode(value: any) {
    const json = JSON.stringify(value);
    const bytes = Buffer.from(json, "utf-8");
    return bytesMarshalBinary(bytes);
  }

  raw(value: any) {
    const json = JSON.stringify(value);
    return Bytes.raw(Buffer.from(json, "utf-8"));
  }
}

export class Any {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  encode(_value: any): Uint8Array {
    throw new Error("cannot marshal type any to binary");
  }
}
