/**
 * ACME amount helper.
 *
 * Accumulate denominates ACME in *base units* where **1 ACME = 1e8 base units**.
 * Passing whole ACME where base units are expected is the single most common
 * integration bug. Use {@link Amount} to convert explicitly.
 *
 * @example
 * ```ts
 * import { Amount, TxBody } from "accumulate-sdk-opendlt";
 * const body = TxBody.sendTokensSingle({ toUrl: "acc://bob.acme/tokens", amount: Amount.acme(5).toWire() });
 * ```
 */

/** Number of decimal places in ACME. */
export const ACME_PRECISION = 8;

/** Base units in one whole ACME (1e8). */
export const ACME_BASE_UNITS = 100_000_000n;

/** An ACME token amount, stored internally as integer base units (bigint). */
export class Amount {
  private constructor(public readonly baseUnits: bigint) {}

  /**
   * Create from whole ACME. `Amount.acme(1)` === 1e8 base units. Accepts
   * number/bigint/string; fractional values are parsed via integer math so
   * there is no floating-point precision loss.
   */
  static acme(wholeAcme: number | bigint | string): Amount {
    if (typeof wholeAcme === "bigint") return new Amount(wholeAcme * ACME_BASE_UNITS);
    const s = String(wholeAcme);
    const negative = s.startsWith("-");
    const [whole, frac = ""] = s.replace("-", "").split(".");
    const fracPadded = (frac + "0".repeat(ACME_PRECISION)).slice(0, ACME_PRECISION);
    const units = BigInt(whole || "0") * ACME_BASE_UNITS + BigInt(fracPadded || "0");
    return new Amount(negative ? -units : units);
  }

  /** Create from raw base units (the wire representation). */
  static baseUnits(units: number | bigint | string): Amount {
    return new Amount(BigInt(units));
  }

  /**
   * ACME base units needed to buy `creditCount` credits at `oraclePrice`
   * (the integer oracle value from the network oracle query).
   */
  static credits(creditCount: number | bigint, oraclePrice: number | bigint): Amount {
    return new Amount((BigInt(creditCount) * ACME_BASE_UNITS * 100n) / BigInt(oraclePrice));
  }

  /** Wire representation: base units as a string (what `TxBody` expects). */
  toWire(): string {
    return this.baseUnits.toString();
  }

  toString(): string {
    return this.toWire();
  }

  /** Whole ACME as a number (may lose precision for very large amounts). */
  toAcme(): number {
    return Number(this.baseUnits) / Number(ACME_BASE_UNITS);
  }
}
