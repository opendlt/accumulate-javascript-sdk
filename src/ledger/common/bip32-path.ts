/*
 * Bitcoin BIP32 path helpers
 * (C) 2016 Alex Beregszaszi
 */

const HARDENED = 0x80000000;

export default class Bip32Path {
  path: number[];
  constructor(path: number[] = []) {
    for (let i = 0; i < path.length; i++) {
      if (typeof path[i] !== "number") {
        throw new Error("Path element is not a number");
      }
    }
    this.path = path;
  }

  validatePathArray(path: number[]) {
    try {
      this.fromPathArray(path);
      return true;
    } catch (e) {
      return false;
    }
  }

  validateString(text: string, reqRoot: boolean): boolean {
    try {
      this.fromString(text, reqRoot);
      return true;
    } catch (e) {
      return false;
    }
  }
  fromPathArray(path: number[]): Bip32Path {
    return new Bip32Path(path);
  }

  fromString(text: string, reqRoot = false): Bip32Path {
    // skip the root
    //let text = "";
    if (/^m\//i.test(text)) {
      text = text.slice(2);
    } else if (reqRoot) {
      throw new Error("Root element is required");
    }

    const path = text.split("/");
    const ret = [];
    for (let i = 0; i < path.length; i++) {
      const tmp = /(\d+)([hH']?)/.exec(path[i]);
      if (tmp === null) {
        throw new Error("Invalid input");
      }
      ret.push(parseInt(tmp[1], 10));

      if (ret[i] >= HARDENED) {
        throw new Error("Invalid child index");
      }

      if (tmp[2] === "h" || tmp[2] === "H" || tmp[2] === "'") {
        ret[i] += HARDENED;
      } else if (tmp[2].length != 0) {
        throw new Error("Invalid modifier");
      }
    }
    return new Bip32Path(ret);
  }

  toPathArray() {
    return this.path;
  }

  toString(noRoot = false, oldStyle = false) {
    const ret = new Array(this.path.length);
    for (let i = 0; i < this.path.length; i++) {
      const tmp = this.path[i];
      if (tmp & HARDENED) {
        ret[i] = (tmp & ~HARDENED) + (oldStyle ? "h" : "'");
      } else {
        ret[i] = tmp;
      }
    }
    return (noRoot ? "" : "m/") + ret.join("/");
  }

  inspect(): string {
    return "Bip32Path <" + this.toString() + ">";
  }
}

export const BIPPath = new Bip32Path();
