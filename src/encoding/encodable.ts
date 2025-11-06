// Note: Consumer type and functions moved to avoid circular dependency

import * as url from "../address/index.js";
import { Buffer } from "../common/buffer.js";
import {
  bigNumberMarshalBinary as bigIntMarshalBinary,
  booleanMarshalBinary,
  bytesMarshalBinary,
  hashMarshalBinary,
  stringMarshalBinary,
  uvarintMarshalBinary as uintMarshalBinary,
  uvarintMarshalBinary,
  varintMarshalBinary as intMarshalBinary,
} from "./encoding.js";

export interface Encodable {
  embedding?: boolean;
  encode(value: any): Uint8Array;
  consume?(value: any, consumer: any): void;
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
    throw new Error("TODO: marshal duration to binary");
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
    throw new Error("TODO: marshal float to binary");
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
  constructor(public readonly type?: any) {}
  encode(value: number) {
    return uintMarshalBinary(value);
  }
}

export class Union {
  composite = true;
  private _encode?: any;
  private _consume?: any;

  private getEncode() {
    if (!this._encode) {
      // Import encode function dynamically to avoid circular dependency
      const { encode } = require("./index.js");
      this._encode = encode;
    }
    return this._encode;
  }

  private getConsume() {
    if (!this._consume) {
      // Import consume function dynamically to avoid circular dependency
      const { consume } = require("./index.js");
      this._consume = consume;
    }
    return this._consume;
  }

  encode(value: any) {
    return bytesMarshalBinary(this.getEncode()(value));
  }
  consume(value: any, consumer: any) {
    this.getConsume()(value, consumer);
  }
}

export class Reference {
  composite = true;
  private _encode?: any;
  private _consume?: any;

  private getEncode() {
    if (!this._encode) {
      // Import encode function dynamically to avoid circular dependency
      const { encode } = require("./index.js");
      this._encode = encode;
    }
    return this._encode;
  }

  private getConsume() {
    if (!this._consume) {
      // Import consume function dynamically to avoid circular dependency
      const { consume } = require("./index.js");
      this._consume = consume;
    }
    return this._consume;
  }

  encode(value: any) {
    return bytesMarshalBinary(this.getEncode()(value));
  }
  consume(value: any, consumer: any) {
    this.getConsume()(value, consumer);
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
