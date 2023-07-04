/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-undef */

type Encoding = "hex" | "utf-8" | "base64";

export class Buffer extends Uint8Array {
  static from(v: string | Iterable<number>, encoding?: Encoding) {
    // @ts-ignore
    if (typeof globalThis?.Buffer === "function") {
      // @ts-ignore
      return globalThis.Buffer.from(v, encoding);
    }

    if (typeof v !== "string") {
      return new this(Uint8Array.from(v));
    }

    switch (encoding) {
      case "hex":
        if (v.length % 2 != 0) v = "0" + v;
        return new this(Uint8Array.from(v.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))));

      case "base64": {
        const b = new TextEncoder().encode(atob(v));
        return new this(b);
      }

      default: {
        // Default to utf-8
        const b = new TextEncoder().encode(v);
        return new this(b);
      }
    }
  }

  static concat(v: ArrayLike<number>[]) {
    const len = v.reduce((v, u) => v + u.length, 0);
    const merged = new Uint8Array(len);
    let offset = 0;
    for (const item of v) {
      merged.set(item, offset);
      offset += item.length;
    }
    return merged;
  }

  // @ts-ignore
  toString(encoding: Encoding) {
    switch (encoding) {
      case "hex":
        return this.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

      case "base64": {
        return btoa(new TextDecoder().decode(this));
      }

      default: {
        // Default to utf-8
        return new TextDecoder("utf-8").decode(this);
      }
    }
  }
}
