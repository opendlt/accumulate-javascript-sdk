import BN from "bn.js";
import { booleanMarshalBinary, bytesMarshalBinary, varintMarshalBinary } from "./encoding";

export type Receipt = {
  start: Uint8Array | string;
  startIndex: number | BN;
  end: Uint8Array | string;
  endIndex: number | BN;
  anchor: Uint8Array | string;
  entries: ReceiptEntry[];
};

export type ReceiptEntry = {
  right?: boolean;
  hash: Uint8Array | string;
};

/**
 * Create a deep copy of a Receipt object
 * @param receipt to clone
 */
export function cloneReceipt(receipt: Receipt): Receipt {
  return {
    start: copyHash(receipt.start),
    startIndex: receipt.startIndex,
    end: copyHash(receipt.end),
    endIndex: receipt.endIndex,
    anchor: copyHash(receipt.anchor),
    entries: receipt.entries.map(copyReceiptEntry),
  };
}

function copyReceiptEntry(re: ReceiptEntry): ReceiptEntry {
  const result: ReceiptEntry = { hash: copyHash(re.hash) };
  if (re.right) {
    result.right = true;
  }
  return result;
}

function copyHash(hash: Uint8Array | string): Uint8Array | string {
  return hash instanceof Uint8Array ? Buffer.from(hash) : hash;
}

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

  const result = cloneReceipt(r1);
  result.anchor = copyHash(r2.anchor);

  r2.entries.forEach((e) => result.entries.push(copyReceiptEntry(e)));

  return result;
}

export function marshalBinaryReceipt(receipt: Receipt): Buffer {
  const forConcat = [];

  forConcat.push(bytesMarshalBinary(getBytes(receipt.start), 1));
  if (receipt.startIndex) {
    forConcat.push(varintMarshalBinary(receipt.startIndex, 2));
  }
  forConcat.push(bytesMarshalBinary(getBytes(receipt.end), 3));
  if (receipt.endIndex) {
    forConcat.push(varintMarshalBinary(receipt.endIndex, 4));
  }
  forConcat.push(bytesMarshalBinary(getBytes(receipt.anchor), 5));

  receipt.entries.forEach((entry) =>
    forConcat.push(bytesMarshalBinary(marshalBinaryEntry(entry), 6))
  );

  return Buffer.concat(forConcat);
}

function marshalBinaryEntry(re: ReceiptEntry): Buffer {
  const forConcat = [];

  if (re.right) {
    forConcat.push(booleanMarshalBinary(re.right, 1));
  }

  forConcat.push(bytesMarshalBinary(getBytes(re.hash), 2));

  return Buffer.concat(forConcat);
}

function getBytes(hash: Uint8Array | string): Uint8Array {
  return hash instanceof Uint8Array ? hash : Buffer.from(hash, "hex");
}
