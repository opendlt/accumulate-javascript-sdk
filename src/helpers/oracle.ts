/**
 * Oracle utility functions for credit/ACME calculations.
 *
 * Aligned with:
 *   - Rust:   get_oracle_price(), calculate_credits_amount()
 *   - Python: get_oracle_price(), calculate_credits_to_acme()
 *   - Dart:   getOracle(), calculateCreditsAmount()
 */

import type { Accumulate } from "./accumulate.js";

/**
 * Get the current ACME oracle price from the network.
 * @param client  Unified Accumulate client.
 * @returns Oracle price as an integer (price per ACME in credit-units * 100).
 */
export async function getOraclePrice(client: Accumulate): Promise<number> {
  return client.getOraclePrice();
}

/**
 * Calculate the amount of ACME (in smallest unit) needed to purchase a
 * given number of credits at the current oracle price.
 *
 * Formula (from Accumulate protocol):
 *   credits_per_acme = oracle / 500
 *   acme_needed = (desired_credits / credits_per_acme) * 1e8
 *
 * Simplified:
 *   acme_amount = (desired_credits * 500 * 1e8) / oracle
 *
 * @param credits  Number of credits desired.
 * @param oraclePrice  Current oracle price.
 * @returns ACME amount in the smallest unit (1e8 = 1 ACME).
 */
export function calculateCreditsToAcme(
  credits: number,
  oraclePrice: number,
): bigint {
  if (oraclePrice <= 0) throw new Error("Oracle price must be positive");
  // credits * 500 * 1e8 / oracle, rounded up
  const numerator = BigInt(credits) * BigInt(500) * BigInt(100_000_000);
  const denominator = BigInt(oraclePrice);
  // Ceiling division
  return (numerator + denominator - 1n) / denominator;
}
