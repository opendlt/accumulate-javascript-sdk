import { createHash, BinaryLike } from "crypto";

export function sha256(data: BinaryLike): Buffer {
  return createHash("sha256").update(data).digest();
}
