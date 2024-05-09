/* eslint-disable @typescript-eslint/no-namespace */

export type PeerIDArgs = string;
export class PeerID {
  constructor(private readonly value: string) {}
  asObject() {
    return this.value;
  }
  toString() {
    return this.value;
  }
  static fromObject(value: string | PeerID) {
    if (value instanceof PeerID) return value;
    return new this(value);
  }
}

export type MultiaddrArgs = string | Multiaddr;

export class Multiaddr {
  constructor(public readonly value: string) {}

  static fromObject(obj: MultiaddrArgs): Multiaddr {
    if (obj instanceof Multiaddr) {
      return obj;
    }
    return new Multiaddr(obj);
  }

  asObject() {
    return this.value;
  }
}
