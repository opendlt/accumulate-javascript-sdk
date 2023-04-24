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
