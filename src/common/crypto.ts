/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Buffer } from "./buffer";

async function makeSHA(size: number): Promise<(data: Uint8Array) => Promise<Uint8Array>> {
  if ("crypto" in globalThis) {
    // Browser
    // @ts-ignore
    return async (data: Uint8Array) =>
      new Uint8Array(await crypto.subtle.digest(`SHA-${size}`, data));
  }

  // Node
  // @ts-ignore
  const { createHash } = await import("crypto");
  const hash = createHash(`sha${size}`);
  return (data) => Promise.resolve(hash.update(data).digest());
}

const hSHA256: Promise<(data: Uint8Array) => Promise<Uint8Array>> = makeSHA(256);
const hSHA512: Promise<(data: Uint8Array) => Promise<Uint8Array>> = makeSHA(512);

export async function sha256(data: Uint8Array): Promise<Buffer> {
  return Buffer.from(await (await hSHA256)(data));
}

export async function sha512(data: Uint8Array): Promise<Buffer> {
  return Buffer.from(await (await hSHA512)(data));
}

export async function hashTree(items: Uint8Array[]): Promise<Uint8Array> {
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
