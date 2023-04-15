import { randomBytes } from "tweetnacl";
import { BN, Client } from "../src";
import { ED25519KeypairSigner, LiteSigner } from "../src/signing";
import { URL } from "../src/url";

export function randomLiteIdentity(): LiteSigner {
  return new LiteSigner(ED25519KeypairSigner.generate());
}

export function randomBuffer(length = 12) {
  return Buffer.from(randomBytes(length));
}

export function randomString(length = 6) {
  return randomBuffer(length * 2).toString("hex");
}

export async function addCredits(
  client: Client,
  recipient: URL | string,
  creditAmount: number,
  signer: LiteSigner
) {
  let res = await client.queryUrl(recipient);
  const originalBalance = new BN(res.data.creditBalance);
  const oracle = await client.queryAcmeOracle();
  const addCredits = {
    recipient,
    amount: (creditAmount * 1e8) / oracle,
    oracle,
  };
  res = await client.addCredits(signer.acmeTokenAccount, addCredits, signer);
  await client.waitOnTx(res.txid);

  res = await client.queryUrl(recipient);
  expect(new BN(res.data.creditBalance)).toStrictEqual(originalBalance.add(new BN(creditAmount)));
}
