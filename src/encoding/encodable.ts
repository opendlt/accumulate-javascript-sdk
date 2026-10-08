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

// Global variable for module loading - will be set by index.ts to avoid circular dependency
let indexModule: { encode: (target: any) => Uint8Array; consume: (target: any, consumer: any) => void } | undefined;

// Function to set the index module (called by index.ts after defining encode/consume)
export function setIndexModule(module: { encode: (target: any) => Uint8Array; consume: (target: any, consumer: any) => void }) {
  indexModule = module;
}

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
    // Floor to convert milliseconds to whole seconds (required for BigInt conversion)
    // Must use signed varint (intMarshalBinary) to match Go's WriteTime which uses
    // binary.PutVarint (zigzag encoding), not binary.PutUvarint.
    return intMarshalBinary(Math.floor(value.getTime() / 1000));
  }
}

/**
 * A duration as the node reports it and accepts it: `{ seconds, nanoseconds }` (what the node
 * emits), a number of seconds, or a Go duration string such as `"1m30s"`.
 */
export type DurationArgs = number | string | { seconds?: number; nanoseconds?: number };

const GO_DURATION_UNITS: Record<string, number> = {
  ns: 1e-9,
  us: 1e-6,
  "\u00b5s": 1e-6,
  "\u03bcs": 1e-6,
  ms: 1e-3,
  s: 1,
  m: 60,
  h: 3600,
};

export class Duration {
  /**
   * Convert any accepted duration form to a number of seconds.
   * @throws if a string is not a valid Go duration.
   */
  static toSeconds(value: DurationArgs): number {
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const text = value.trim();
      if (text === "0") return 0;
      const re = /(\d+(?:\.\d+)?|\.\d+)([a-z\u00b5\u03bc]+)/gy;
      let total = 0;
      let consumed = 0;
      for (let m = re.exec(text); m; m = re.exec(text)) {
        const unit = GO_DURATION_UNITS[m[2]];
        if (unit === undefined)
          throw new Error(`Invalid duration '${value}': unknown unit '${m[2]}'`);
        total += parseFloat(m[1]) * unit;
        consumed = re.lastIndex;
      }
      if (consumed === 0 || consumed !== text.length)
        throw new Error(`Invalid duration '${value}'`);
      return total;
    }
    return (value.seconds ?? 0) + (value.nanoseconds ?? 0) / 1e9;
  }

  /**
   * Marshal as Go's WriteDuration does: unsigned varint seconds followed by unsigned varint
   * nanoseconds (the field number is written by the caller).
   */
  encode(value: DurationArgs): Uint8Array {
    const total = Duration.toSeconds(value);
    let sec = Math.floor(total);
    let ns = Math.round((total - sec) * 1e9);
    if (ns >= 1e9) {
      sec += 1;
      ns -= 1e9;
    }
    return Buffer.concat([uvarintMarshalBinary(sec), uvarintMarshalBinary(ns)]);
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

  encode(value: any) {
    // Use preloaded module to avoid circular dependency
    if (!indexModule) {
      throw new Error("Index module not preloaded - call setIndexModule first");
    }
    return bytesMarshalBinary(indexModule.encode(value));
  }
  consume(value: any, consumer: any) {
    // Use preloaded module to avoid circular dependency
    if (!indexModule) {
      throw new Error("Index module not preloaded - call setIndexModule first");
    }
    indexModule.consume(value, consumer);
  }
}

export class Reference {
  composite = true;

  encode(value: any) {
    // Use preloaded module to avoid circular dependency
    if (!indexModule) {
      throw new Error("Index module not preloaded - call setIndexModule first");
    }
    return bytesMarshalBinary(indexModule.encode(value));
  }
  consume(value: any, consumer: any) {
    // Use preloaded module to avoid circular dependency
    if (!indexModule) {
      throw new Error("Index module not preloaded - call setIndexModule first");
    }
    indexModule.consume(value, consumer);
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
