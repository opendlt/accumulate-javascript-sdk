import { randomBytes } from "tweetnacl";
import { ACME_TOKEN_URL, Client, Keypair, LiteAccount, KeypairSigner, OriginSigner } from "..";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");
let acc: LiteAccount;

beforeAll(async () => {
  acc = LiteAccount.generate();
  await client.faucet(acc.url);
  await waitOn(async () => {
    const { data } = await client.queryUrl(acc.url);
    expect(data.type).toStrictEqual("liteTokenAccount");
  });
});

test("should send tokens", async () => {
  const recipient = LiteAccount.generate();

  const amount = 50;
  const sendTokens = { to: [{ url: recipient.url, amount: amount }] };
  await client.sendTokens(sendTokens, acc);

  await waitOn(() => client.queryUrl(recipient.url));

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
  await waitOn(async () => {
    const { data } = await client.queryUrl(acc.url);
    expect(data.creditBalance).toStrictEqual(amount);
  });
});

test("should manage identity", async () => {
  const identityKeypair = Keypair.generate();
  const identityUrl = `acc://${randomString()}`;

  // Create identity
  const createIdentity = {
    url: identityUrl,
    publicKey: identityKeypair.publicKey,
    keyBookName: "book0",
    keyPageName: "page0",
  };

  await client.createIdentity(createIdentity, acc);
  await waitOn(() => client.queryUrl(identityUrl));

  const res = await client.queryUrl(identityUrl);
  expect(res.type).toStrictEqual("identity");

  const identity = new KeypairSigner(identityUrl, identityKeypair);

  await testTokenAccount(identity);
  await testKeyPageAndBook(identity);
  await testData(identity);
});

async function testTokenAccount(identity: OriginSigner) {
  // Create token account
  const tokenAccountUrl = identity.origin + "/ACME";
  const createTokenAccount = {
    url: tokenAccountUrl,
    tokenUrl: ACME_TOKEN_URL,
  };
  await client.createTokenAccount(createTokenAccount, identity);
  await waitOn(() => client.queryUrl(tokenAccountUrl));

  const res = await client.queryUrl(tokenAccountUrl);
  expect(res.type).toStrictEqual("tokenAccount");
}

async function testKeyPageAndBook(identity: OriginSigner) {
  // Create a new key page
  const pageKeypair = Keypair.generate();
  const newKeyPageUrl = identity + "/p/" + randomString();
  const createKeyPage = {
    url: newKeyPageUrl,
    keys: [pageKeypair.publicKey],
  };

  await client.createKeyPage(createKeyPage, identity);
  await waitOn(() => client.queryUrl(newKeyPageUrl));

  let res = await client.queryUrl(newKeyPageUrl);
  expect(res.type).toStrictEqual("keyPage");

  // Create a new key book
  const newKeyBookUrl = identity + "/b/" + randomString();
  const createKeyBook = {
    url: newKeyBookUrl,
    pages: [newKeyPageUrl],
  };

  await client.createKeyBook(createKeyBook, identity);
  await waitOn(() => client.queryUrl(newKeyBookUrl));

  res = await client.queryUrl(newKeyBookUrl);
  expect(res.type).toStrictEqual("keyBook");
}

async function testData(identity: KeypairSigner) {
  // Create data account
  const dataAccountUrl = identity.origin + "/my-data";
  const createDataAccount = {
    url: dataAccountUrl,
  };

  await client.createDataAccount(createDataAccount, identity);
  await waitOn(() => client.queryUrl(dataAccountUrl));

  let res = await client.queryUrl(dataAccountUrl);
  expect(res.type).toStrictEqual("dataAccount");

  // Write data
  const dataAccout = new KeypairSigner(dataAccountUrl, identity.keypair);
  const data = randomBuffer();
  const writeData = {
    extIds: [randomBuffer(), randomBuffer()],
    data,
  };
  await client.writeData(writeData, dataAccout);
  await waitOn(async () => {
    const res = await client.queryData(dataAccountUrl);
    expect(res).toBeTruthy();
  });

  res = await client.queryData(dataAccountUrl);
  expect(res.type).toStrictEqual("dataEntry");
  expect(res.data.entry.data).toStrictEqual(data.toString("hex"));
  expect(res.data.entry.extIds.length).toStrictEqual(2);
  const firstEntryHash = res.data.entryHash;

  const data2 = randomBuffer();
  const writeData2 = {
    extIds: [randomBuffer(), randomBuffer()],
    data: data2,
  };
  await client.writeData(writeData2, dataAccout);
  await waitOn(async () => {
    const res = await client.queryDataSet(dataAccountUrl, { start: 0, count: 10 });
    expect(res.items.length).toStrictEqual(2);
    expect(res.total).toStrictEqual(2);
  });

  // Query Data should now return the latest entry
  res = await client.queryData(dataAccountUrl);
  expect(res.data.entry.data).toStrictEqual(data2.toString("hex"));
  // Query data per entry hash
  res = await client.queryData(dataAccountUrl, firstEntryHash);
  expect(res.data.entry.data).toStrictEqual(data.toString("hex"));
}

async function waitOn(fn: () => void, timeout?: number) {
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

function randomBuffer(length = 12) {
  return Buffer.from(randomBytes(length));
}

function randomString(length = 6) {
  return randomBuffer(length * 2).toString("hex");
}

async function sleep(millis: number) {
  return new Promise((resolve) => setTimeout(resolve, millis));
}
