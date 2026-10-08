/**
 * Local checks for a header hash lock (HTLC), mirroring what the node enforces on submission, so a
 * bad lock fails here with a clear message instead of as a rejected transaction.
 */

import { HashAlgorithm, HashLockOptions, type HashLockOptionsArgs } from "../core/index.js";

const HASH_LENGTH: Partial<Record<HashAlgorithm, number>> = {
  [HashAlgorithm.SHA256]: 32,
  [HashAlgorithm.SHA256D]: 32,
  [HashAlgorithm.HASH160]: 20,
};

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/**
 * Throws if the node would reject this lock outright: an unknown algorithm, a hash of the wrong
 * length (32 bytes for SHA256/SHA256D, 20 for HASH160), or an expiration that is missing, less
 * than 10 minutes away, or more than 30 days away.
 *
 * @param now  The current time (defaults to now); injectable for tests.
 */
export function validateHashLockForSubmit(
  lock: HashLockOptions | HashLockOptionsArgs,
  now: Date = new Date(),
): void {
  const l = lock instanceof HashLockOptions ? lock : new HashLockOptions(lock);
  const want = l.hashAlgorithm === undefined ? undefined : HASH_LENGTH[l.hashAlgorithm];
  if (want === undefined) {
    throw new Error(`unsupported hash algorithm: ${l.hashAlgorithm}`);
  }
  const have = l.hash?.length ?? 0;
  if (have !== want) {
    throw new Error(
      `hash must be ${want} bytes for ${HashAlgorithm.getName(l.hashAlgorithm!)}, got ${have}`,
    );
  }
  if (!l.expiration) throw new Error("expiration is required");
  const ahead = l.expiration.getTime() - now.getTime();
  if (ahead < 10 * MINUTE_MS)
    throw new Error("expiration must be at least 10 minutes in the future");
  if (ahead > 30 * DAY_MS) throw new Error("expiration must be at most 30 days in the future");
}
