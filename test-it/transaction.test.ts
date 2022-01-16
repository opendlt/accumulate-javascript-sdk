import { Transaction, Client, SendTokens, LiteAccount, Header } from "../src";
import { waitOn } from "./util";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");
let acc: LiteAccount;

describe("Test manual transactions", () => {
  beforeAll(async () => {
    acc = LiteAccount.generate();
    await client.faucet(acc.url);
    await waitOn(async () => {
      const { data } = await client.queryUrl(acc.url);
      expect(data.type).toStrictEqual("liteTokenAccount");
    });
  });

  test("should send tokens with manual transaction", async () => {
    const recipient = LiteAccount.generate();
    const amount = 50;
    const payload = new SendTokens({ to: [{ url: recipient.url, amount: amount }] });
    const header = new Header(acc.origin);

    const tx = new Transaction(payload, header);
    const forSignature = tx.dataForSignature();
    const signature = await acc.signRaw(forSignature);
    tx.signature = signature;

    await client.execute(tx);

    await waitOn(() => client.queryUrl(recipient.url));

    const { data } = await client.queryUrl(recipient.url);
    expect(data.balance).toStrictEqual(amount);
  });

  test("should reject unsigned transaction", async () => {
    const recipient = LiteAccount.generate();
    const amount = 50;
    const payload = new SendTokens({ to: [{ url: recipient.url, amount: amount }] });
    const header = new Header(acc.origin);

    const tx = new Transaction(payload, header);

    expect(() => client.execute(tx)).toThrowError(/unsigned transaction/i);
  });
});
