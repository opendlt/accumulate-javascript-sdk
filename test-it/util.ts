import { randomBytes } from "tweetnacl";

export async function waitOn(fn: () => void, timeout?: number) {
    const to = timeout ?? 10_000;
    const start = Date.now();
    let lastError;
    while (Date.now() - start < to) {
      try {
        await fn();
        return;
      } catch (e) {
        lastError = e;
        await sleep(500);
      }
    }
    throw lastError;
  }
  
  export function randomBuffer(length = 12) {
    return Buffer.from(randomBytes(length));
  }
  
  export function randomString(length = 6) {
    return randomBuffer(length * 2).toString("hex");
  }
  
  async function sleep(millis: number) {
    return new Promise((resolve) => setTimeout(resolve, millis));
  }