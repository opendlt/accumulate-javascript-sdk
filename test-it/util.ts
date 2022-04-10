import { randomBytes } from "tweetnacl";
import { AccURL, BN, Client, Ed25519KeypairSigner, LiteAccount, TxSigner } from "../src";

export function randomAcmeLiteAccount() {
  return new LiteAccount(Ed25519KeypairSigner.generate());
}

export async function waitOn(fn: () => void, timeout?: number) {
  const to = timeout ?? 12_000;
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
  creditAmount: number,
  signer: TxSigner
) {
  const { data } = await client.queryUrl(recipient);
  const originalBalance = new BN(data.creditBalance);
  const oracle = await client.queryAcmeOracle();
  const addCredits = {
    recipient,
    amount: (creditAmount * 1e8) / oracle,
    oracle,
  };
  await client.addCredits(signer.url, addCredits, signer);
  await waitOn(async () => {
    const { data } = await client.queryUrl(recipient);
    expect(new BN(data.creditBalance)).toStrictEqual(originalBalance.add(new BN(creditAmount)));
  });
}
