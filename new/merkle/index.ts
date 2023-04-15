/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-namespace */
export * from "./enums_gen";
export * from "./types_gen";

import { Receipt } from "./types_gen";

export function combineReceipts(r1: Receipt, r2: Receipt): Receipt {
    const anchorStr =
        r1.anchor instanceof Uint8Array ? Buffer.from(r1.anchor).toString("hex") : r1.anchor;
    const startStr =
        r2.start instanceof Uint8Array ? Buffer.from(r2.start).toString("hex") : r2.start;
    if (anchorStr !== startStr) {
        throw new Error(
        `Receipts cannot be combined, anchor ${anchorStr} doesn't match root merkle tree ${startStr}`
        );
    }
    if (!r2.anchor) throw new Error('Second receipt is missing the anchor')

    const result = r1.copy();
    if (!result.entries) result.entries = [];
    result.anchor = Buffer.from(r2.anchor);

    r2.entries?.forEach((e) => result.entries!.push(e.copy()));

    return result;
}
