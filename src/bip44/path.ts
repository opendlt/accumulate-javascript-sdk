// Constants
export const Purpose = 0x8000002c;
export const FirstHardenedChild = 0x80000000;
// Coin types (only a few are included that are used in accumulate)
export enum CoinType {
  Bitcoin = 0x80000000,
  Ether = 0x8000003c,
  FactomFactoids = 0x80000083,
  Accumulate = 0x80000119,
}

// Derivation path constants
export const DefaultAccumulateBaseDerivationPath = [
  Purpose,
  CoinType.Accumulate,
  0x80000000,
  0x80000000,
  0x80000000,
];
export const DefaultBitcoinBaseDerivationPath = [Purpose, CoinType.Bitcoin, 0x80000000, 0, 0];
export const DefaultEtherBaseDerivationPath = [Purpose, CoinType.Ether, 0x80000000, 0, 0];
export const DefaultFactoidBaseDerivationPath = [
  Purpose,
  CoinType.FactomFactoids,
  0x80000000,
  0,
  0,
];

export const HDMap: Map<CoinType, number[]> = new Map([
  [CoinType.FactomFactoids, DefaultFactoidBaseDerivationPath],
  [CoinType.Accumulate, DefaultAccumulateBaseDerivationPath],
  [CoinType.Bitcoin, DefaultBitcoinBaseDerivationPath],
  [CoinType.Ether, DefaultEtherBaseDerivationPath],
]);

export function getCoinTypeString(coinType: CoinType, hardened = true): string {
  return `${coinType - FirstHardenedChild}` + (hardened === true ? "'" : "");
}
function extractCoinType(path: string): number | null {
  const match = path.match(/\/(\d+)'/);
  return match ? parseInt(match[1]) : null;
}
export function fromPath(path: string): Derivation {
  const coinType = extractCoinType(path);
  if (typeof coinType !== "number") {
    throw Error(`cannot infer curvve from ${path}`);
  }

  const d = new Derivation(inferCurve(coinType as number));
  d.fromPath(path);
  return d;
}
export function makePath(
  coinType: CoinType,
  account: number,
  change: number,
  address: number,
): string {
  const path = HDMap.get(coinType);
  if (typeof path === "undefined") {
    throw new Error(`coin type ${coinType} not found in HDMap`);
  }

  let curve = Curve.CurveSecp256k1;
  if (coinType === CoinType.Accumulate) {
    curve = Curve.CurveEd25519;
    if (change < FirstHardenedChild) {
      change += FirstHardenedChild;
    }
    if (address < FirstHardenedChild) {
      address += FirstHardenedChild;
    }
  }

  if (account < FirstHardenedChild) {
    account += FirstHardenedChild;
  }

  path[PathElement.Account] = account;
  path[PathElement.Change] = change;
  path[PathElement.Address] = address;
  const d = new Derivation(curve, path);
  return d.toString();
}

export enum Curve {
  CurveSecp256k1,
  CurveEd25519,
}

export enum PathElement {
  Purpose,
  CoinType,
  Account,
  Change,
  Address,
}
// Derivation class
export class Derivation {
  private path: number[];
  private readonly curve: Curve;

  constructor(curve: Curve, path: number[] = []) {
    this.path = path;
    this.curve = curve;
  }

  public getPurpose(): number {
    return this.path[PathElement.Purpose] || 0;
  }

  public getCoinType(): number {
    return this.path[PathElement.CoinType] || 0;
  }

  public getAccount(): number {
    return this.path[PathElement.Account] || 0;
  }

  public getChange(): number {
    return this.path[PathElement.Change] || 0;
  }

  public getAddress(): number {
    return this.path[PathElement.Address] || 0;
  }

  public validate(): void {
    if (this.path.length === 0) {
      throw new Error("Derivation path not set");
    }

    if (this.getPurpose() !== Purpose) {
      throw new Error("Derivation is not BIP44");
    }

    if (!(this.getCoinType() in CoinType)) {
      throw new Error("Invalid coin type");
    }

    // Assuming FirstHardenedChild is a constant from a library
    if (this.getAccount() < FirstHardenedChild) {
      throw new Error(`Account not hardened, ${this.getAccount()}`);
    }

    if (this.curve === Curve.CurveEd25519) {
      //all paths must be hardened
      if (this.getChange() < FirstHardenedChild) {
        throw new Error("Change must be hardened for Ed25519 derivation");
      }

      if (this.getAddress() < FirstHardenedChild) {
        throw new Error("Address must be hardened for Ed25519 derivation");
      }
    }
  }

  public toPath(): string {
    let path = `m/44'/${this.getCoinType() - CoinType.Bitcoin}'`;
    path +=
      this.getAccount() < FirstHardenedChild
        ? `/${this.getAccount()}`
        : `/${this.getAccount() - FirstHardenedChild}'`;
    path +=
      this.getChange() < FirstHardenedChild
        ? `/${this.getChange()}`
        : `/${this.getChange() - FirstHardenedChild}'`;
    path +=
      this.getAddress() < FirstHardenedChild
        ? `/${this.getAddress()}`
        : `/${this.getAddress() - FirstHardenedChild}'`;

    this.validate();
    return path;
  }

  public toString(): string {
    return this.toPath();
  }

  public toPathArray(): number[] {
    return this.path;
  }

  public fromPath(path: string): void {
    let hd = path.split("/");

    if (hd.length === 0) {
      throw new Error("no path was provided");
    }
    if (hd[0] === "m") {
      //strip off leading "m" notation if present
      hd = hd.slice(1);
    }

    if (hd.length !== 5) {
      throw new Error("Insufficient parameters in BIP44 derivation path");
    }

    if (hd[0] !== "44'") {
      throw new Error(`Invalid purpose, expecting BIP44 HD derivation path, but received ${path}`);
    }

    this.path = [Purpose];
    hd.slice(1).forEach((s) => {
      let hardened = false;
      if (s.endsWith("'")) {
        hardened = true;
        s = s.slice(0, -1);
      }
      const n = parseInt(s, 10);
      if (isNaN(n)) {
        throw new Error(`Malformed BIP44 HD derivation path`);
      }
      this.path.push((hardened ? FirstHardenedChild : 0) + n);
    });
  }
}

export function inferCurve(coinType: CoinType): Curve {
  return coinType == CoinType.Accumulate ? Curve.CurveEd25519 : Curve.CurveSecp256k1;
}
