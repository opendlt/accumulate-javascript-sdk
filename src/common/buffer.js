/* eslint-disable no-undef */

class Buffer extends Uint8Array {
  static from(v, encoding) {
    if (typeof globalThis?.Buffer === "function") {
      return globalThis.Buffer.from(...arguments);
    }

    if (typeof v !== "string") {
      return new this(Uint8Array.from(v));
    }

    switch (encoding) {
      case "hex":
        if (v.length % 2 != 0) v = "0" + v;
        return new this(Uint8Array.from(v.match(/.{2}/g).map((byte) => parseInt(byte, 16))));

      case "base64": {
        const b = new TextEncoder().encode(atob(v));
        return new this(Uint8Array(b));
      }

      default: {
        // Default to utf-8
        const b = new TextEncoder("utf-8").encode(v);
        return new this(Uint8Array(b));
      }
    }
  }

  static concat(v) {
    const len = v.reduce((v, u) => v + u.length, 0);
    const merged = new Uint8Array(len);
    let offset = 0;
    for (const item of v) {
      merged.set(item, offset);
      offset += item.length;
    }
    return merged;
  }

  toString(encoding) {
    switch (encoding) {
      case "hex":
        return this.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");

      case "base64": {
        return new TextDecoder().decode(btoa(v));
      }

      default: {
        // Default to utf-8
        return new TextDecoder("utf-8").decode(v);
      }
    }
  }
}

exports.Buffer = Buffer;
exports.BufferCls = Buffer;
