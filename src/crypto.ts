import { Buffer } from "buffer";

const hasher: Promise<(data: Uint8Array) => Promise<Buffer>> = (async () => {
  if ('crypto' in global) {
    // Browser
    return async (data: Uint8Array) => Buffer.from(await crypto.subtle.digest('SHA-256', data));
  }

  // Node
  const { createHash } = await import("crypto");
  return (data: Uint8Array) => Promise.resolve(createHash('sha256').update(data).digest())
})();

export async function sha256(data: Uint8Array): Promise<Buffer> {
  return (await hasher)(data);
}

export async function hashTree(items: Uint8Array[]): Promise<Buffer> {
  const hashes = await Promise.all(items.map((i) => sha256(i)));

  while (hashes.length > 1) {
    let i = 0; // hashes index
    let p = 0; // pointer
    while (i < hashes.length) {
      if (i === hashes.length - 1) {
        // Move the last "alone" leaf to the pointer
        hashes[p] = hashes[i];
        i += 1;
      } else {
        hashes[p] = await sha256(Buffer.concat([hashes[i], hashes[i + 1]]));
        i += 2;
      }
      p += 1;
    }
    hashes.length = p;
  }

  return hashes[0];
}
