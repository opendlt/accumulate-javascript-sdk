/*
import { BN, Client, Header, Transaction } from "../src";
import { SendTokens } from "../src/core";
import { addCredits, randomLiteIdentity } from "./util";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");
let lid: LiteIdentity;

describe("Test manual transactions", () => {
  beforeAll(async () => {
    lid = randomLiteIdentity();

    // Get some ACME
    const res = await client.faucet(lid.acmeTokenAccount);
    await client.waitOnTx(res.txid);

    // Get some credits
    await addCredits(client, lid.url, 10_000, lid);
  });

  test("should send tokens with manual transaction", async () => {
    const recipient = randomLiteIdentity().acmeTokenAccount;
    const amount = new BN(1025);
    const payload = new SendTokens({ to: [{ url: recipient, amount: amount }] });
    const header = new Header(lid.acmeTokenAccount);

    const tx = new Transaction(payload, header);
    const forSignature = tx.dataForSignature(lid.info);
    const signature = await lid.signer.signRaw(forSignature);
    tx.signature = { signerInfo: lid.info, signature };

    const res = await client.execute(tx);
    await client.waitOnTx(res.txid);

    const { data } = await client.queryUrl(recipient);
    expect(new BN(data.balance)).toStrictEqual(amount);
  });

  test("should reject unsigned transaction", async () => {
    const recipient = randomLiteIdentity().acmeTokenAccount;
    const amount = 50;
    const payload = new SendTokens({ to: [{ url: recipient, amount: amount }] });
    const header = new Header(lid.url);

    const tx = new Transaction(payload, header);

    expect(() => client.execute(tx)).toThrowError(/unsigned transaction/i);
  });
});
*/