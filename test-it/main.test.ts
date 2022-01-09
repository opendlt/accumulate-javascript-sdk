import { Client, Keypair, LiteAccount, OriginSigner } from "..";

const client = new Client("http://127.0.1.1:26660/v2");
let acc: LiteAccount;

beforeAll(async () => {
  acc = LiteAccount.generate();
  await client.faucet(acc.url);
  await sleep(4000);
});

test("should send tokens", async () => {
  const recipient = LiteAccount.generate();

  const amount = 50;
  const sendTokens = { to: [{ url: recipient.url, amount: amount }] };
  await client.sendTokens(sendTokens, acc);
  await sleep(4000);

  const { data } = await client.queryUrl(recipient.url);
  expect(data.balance).toStrictEqual(amount);
});

test("should add credits", async () => {
  const amount = 1000;
  const addCredits = {
    recipient: acc.url,
    amount,
  };

  await client.addCredits(addCredits, acc);
  await sleep(4000);

  const { data } = await client.queryUrl(acc.url);
  expect(data.creditBalance).toStrictEqual(amount);
});

test("should create identity", async () => {
  const identityKeyPair = Keypair.generate();
  const identity = new OriginSigner("acc://luap", identityKeyPair);

  const createIdentity = {
    url: identity.url,
    publicKey: identityKeyPair.publicKey,
    keyBookName: "luap-book",
    keyPageName: "luap-page",
  };

  await client.createIdentity(createIdentity, acc);
  await sleep(4000);

  const { data } = await client.queryUrl(identity.url);
  expect(data.type).toStrictEqual("identity");
});

async function sleep(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
