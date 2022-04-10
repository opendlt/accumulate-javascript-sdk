import { BN, Client, Header, LiteAccount, SendTokens, Transaction } from "../src";
import { addCredits, randomAcmeLiteAccount, waitOn } from "./util";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");
let acc: LiteAccount;

describe("Test manual transactions", () => {
  beforeAll(async () => {
    acc = randomAcmeLiteAccount();

    // Get some ACME
    await client.faucet(acc.url);
    await waitOn(async () => {
      const { data } = await client.queryUrl(acc.url);
      expect(data.type).toStrictEqual("liteTokenAccount");
    });

    // Get some credits
    await addCredits(client, acc.url, 10_000, acc);
  });

  test("should send tokens with manual transaction", async () => {
    const recipient = randomAcmeLiteAccount();
    const amount = new BN(1025);
    const payload = new SendTokens({ to: [{ url: recipient.url, amount: amount }] });
    const header = new Header(acc.url);

    const tx = new Transaction(payload, header);
    const forSignature = tx.dataForSignature(acc.info);
    const signature = await acc.signer.signRaw(forSignature);
    tx.signature = { signerInfo: acc.info, signature };

    await client.execute(tx);

    await waitOn(() => client.queryUrl(recipient.url));

    const { data } = await client.queryUrl(recipient.url);
    expect(new BN(data.balance)).toStrictEqual(amount);
  });

  test("should reject unsigned transaction", async () => {
    const recipient = randomAcmeLiteAccount();
    const amount = 50;
    const payload = new SendTokens({ to: [{ url: recipient.url, amount: amount }] });
    const header = new Header(acc.url);

    const tx = new Transaction(payload, header);

    expect(() => client.execute(tx)).toThrowError(/unsigned transaction/i);
  });
});
