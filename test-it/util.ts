import { randomBytes } from "tweetnacl";
import { AccURL, Client, OriginSigner, BN } from "..";

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

export async function addCredits(
  client: Client,
  recipient: AccURL | string,
  amount: number,
  signer: OriginSigner
) {
  const { data } = await client.queryUrl(recipient);
  const originalBalance = new BN(data.creditBalance);
  const addCredits = {
    recipient,
    amount,
  };
  await client.addCredits(addCredits, signer);
  await waitOn(async () => {
    const { data } = await client.queryUrl(recipient);
    expect(new BN(data.creditBalance)).toStrictEqual(originalBalance.add(new BN(amount)));
  });
}
