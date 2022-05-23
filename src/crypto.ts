import { BinaryLike, createHash } from "crypto";

export function sha256(data: BinaryLike): Buffer {
  return createHash("sha256").update(data).digest();
}

export function hashTree(items: Uint8Array[]): Buffer {
  const hashes = items.map((i) => sha256(i));

  while (hashes.length > 1) {
    let i = 0; // hashes index
    let p = 0; // pointer
    while (i < hashes.length) {
      if (i === hashes.length - 1) {
        // Move the last "alone" leaf to the pointer
        hashes[p] = hashes[i];
        i += 1;
      } else {
        hashes[p] = sha256(Buffer.concat([hashes[i], hashes[i + 1]]));
        i += 2;
      }
      p += 1;
    }
    hashes.length = p;
  }

  return hashes[0];
}
