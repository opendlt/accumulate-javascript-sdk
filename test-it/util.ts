import { randomBytes } from "tweetnacl";
import { AccURL, BN, Client, Ed25519KeypairSigner, LiteAccount, TxSigner } from "../src";

export function randomAcmeLiteAccount() {
  return new LiteAccount(Ed25519KeypairSigner.generate());
}

export function randomBuffer(length = 12) {
  return Buffer.from(randomBytes(length));
}

export function randomString(length = 6) {
  return randomBuffer(length * 2).toString("hex");
}

export async function addCredits(
  client: Client,
  recipient: AccURL | string,
  creditAmount: number,
  signer: TxSigner
) {
  let res = await client.queryUrl(recipient);
  const originalBalance = new BN(res.data.creditBalance);
  const oracle = await client.queryAcmeOracle();
  const addCredits = {
    recipient,
    amount: (creditAmount * 1e8) / oracle,
    oracle,
  };
  res = await client.addCredits(signer.url, addCredits, signer);
  await client.waitOnTx(res.txid);

  res = await client.queryUrl(recipient);
  expect(new BN(res.data.creditBalance)).toStrictEqual(originalBalance.add(new BN(creditAmount)));
}
