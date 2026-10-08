/**
 * Options for the v3 proof service (spine / anchor proofs). Matches Go pkg/api/v3 options.
 * Responses are returned as the node's JSON (`MajorHeaderRecord[]`, `MinorRootRecord`,
 * `AnchorReceiptRecord`); the receipt inside can be read with `new api_v3.Receipt(...)`.
 */

/** `major-header-range`: a record per major block in [start, end]. Only the directory serves this. */
export type MajorHeaderRangeOptionsArgs = {
  /** The partition to serve; only the directory serves this. */
  partition: string;
  /** The first major block index. */
  start: number;
  /** The last major block index, inclusive. */
  end: number;
};

/** `minor-root-range`: binds minor blocks past the spine to it. Only the directory serves this. */
export type MinorRootRangeOptionsArgs = {
  /** The partition to serve; only the directory serves this. */
  partition: string;
  /** The client's last verified minor block. */
  since: number;
  /** The target minor block, or 0 for as far as possible. */
  until?: number;
};

/**
 * `anchor-receipt`: bind a partition's BPT root to a directory root. This is the second call of a
 * two-call account proof; the first (a query with `includeReceipt`) returns a Receipt that is not
 * `complete`, whose `partition` and end hash go here.
 */
export type AnchorReceiptOptionsArgs = {
  /** The partition whose BPT root is being bound (the first call's `Receipt.partition`). */
  partition: string;
  /** Where the first call's receipt terminates: 32 bytes, or 64 hex characters. */
  bptRoot: Uint8Array | string;
  /**
   * Ask for a receipt terminating at a directory root no older than this block. 0 or absent
   * returns the oldest receipt that works.
   */
  atOrAfter?: number;
};

/** Serialize AnchorReceipt options to the wire form (hex `bptRoot`), validating the root length. */
export function anchorReceiptParams(opts: AnchorReceiptOptionsArgs): Record<string, unknown> {
  const root = typeof opts.bptRoot === "string" ? opts.bptRoot.toLowerCase() : toHex(opts.bptRoot);
  if (!/^[0-9a-f]{64}$/.test(root)) {
    throw new Error("bptRoot must be 32 bytes (64 hex characters)");
  }
  const out: Record<string, unknown> = { partition: opts.partition, bptRoot: root };
  if (opts.atOrAfter) out.atOrAfter = opts.atOrAfter;
  return out;
}

function toHex(b: Uint8Array): string {
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}
