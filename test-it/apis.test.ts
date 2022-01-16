import {
  ACME_TOKEN_URL,
  Client,
  Keypair,
  LiteAccount,
  KeypairSigner,
  OriginSigner,
  KeyPageOperation,
} from "../src";
import { randomBuffer, randomString, waitOn } from "./util";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");
let acc: LiteAccount;

describe("Test Accumulate APIs", () => {
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
    const { txid } = await client.sendTokens(sendTokens, acc);

    await waitOn(() => client.queryUrl(recipient.url));

    const { data } = await client.queryUrl(recipient.url);
    expect(data.balance).toStrictEqual(amount);

    const res = await client.queryTx(txid);
    expect(res.type).toStrictEqual("sendTokens");
    expect(res.txid).toStrictEqual(txid);
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

    let res = await client.queryUrl(identityUrl);
    expect(res.type).toStrictEqual("identity");

    const identity = new KeypairSigner(identityUrl, identityKeypair);

    await testTokenAccount(identity);
    await testData(identity);
    await testKeyPageAndBook(identity);

    res = await client.queryDirectory(identity.origin, { start: 0, count: 3 });
    expect(res.type).toStrictEqual("directory");
    expect(res.items.length).toStrictEqual(3);
    res = await client.queryDirectory(identity.origin, { start: 0, count: res.total });
    expect(res.items.length).toStrictEqual(res.total);
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

  async function testKeyPageAndBook(identity: KeypairSigner) {
    // Create a new key page
    const pageKeypair = Keypair.generate();
    const newKeyPageUrl = identity + "/" + randomString();
    const createKeyPage = {
      url: newKeyPageUrl,
      keys: [pageKeypair.publicKey],
    };

    await client.createKeyPage(createKeyPage, identity);
    await waitOn(() => client.queryUrl(newKeyPageUrl));

    let res = await client.queryUrl(newKeyPageUrl);
    expect(res.type).toStrictEqual("keyPage");

    // Create a new key book
    const newKeyBookUrl = identity + "/" + randomString();
    const createKeyBook = {
      url: newKeyBookUrl,
      pages: [newKeyPageUrl],
    };

    await client.createKeyBook(createKeyBook, identity);
    await waitOn(() => client.queryUrl(newKeyBookUrl));

    res = await client.queryUrl(newKeyBookUrl);
    expect(res.type).toStrictEqual("keyBook");

    // verify page is part of the book now
    res = await client.queryUrl(newKeyPageUrl);
    expect(res.data.keyBook).toStrictEqual(newKeyBookUrl.toString());

    let keyPage = new KeypairSigner(newKeyPageUrl, pageKeypair, { keyPageHeigt: 2 });

    // Add new key to keypage
    const newKey = Keypair.generate();
    const addKeyPage = {
      operation: KeyPageOperation.AddKey,
      newKey: newKey.publicKey,
    };

    await client.updateKeyPage(addKeyPage, keyPage);
    await waitOn(async () => {
      const res = await client.queryUrl(newKeyPageUrl);
      expect(res.data.keys.length).toStrictEqual(2);
    });

    // Set threshold
    const setThreshold = {
      operation: KeyPageOperation.SetThreshold,
      threshold: 2,
    };
    keyPage = new KeypairSigner(newKeyPageUrl, pageKeypair, { keyPageHeigt: 3 });
    await client.updateKeyPage(setThreshold, keyPage);
    await waitOn(async () => {
      const res = await client.queryUrl(newKeyPageUrl);
      expect(res.data.threshold).toStrictEqual(2);
    });

    // Update keypage
    keyPage = new KeypairSigner(newKeyPageUrl, pageKeypair, { keyPageHeigt: 4 });
    const newNewKey = Keypair.generate();
    const updateKeyPage = {
      operation: KeyPageOperation.UpdateKey,
      key: newKey.publicKey,
      newKey: newNewKey.publicKey,
    };
    await client.updateKeyPage(updateKeyPage, keyPage);
    await waitOn(async () => {
      const res = await client.queryUrl(newKeyPageUrl);
      expect(res.data.keys[1].publicKey).toStrictEqual(
        Buffer.from(newNewKey.publicKey).toString("hex")
      );
    });

    // Remove key from keypage
    keyPage = new KeypairSigner(newKeyPageUrl, pageKeypair, { keyPageHeigt: 5 });
    const removeKeyPage = {
      operation: KeyPageOperation.RemoveKey,
      key: newNewKey.publicKey,
    };
    await client.updateKeyPage(removeKeyPage, keyPage);
    await waitOn(async () => {
      const res = await client.queryUrl(newKeyPageUrl);
      expect(res.data.keys.length).toStrictEqual(1);
      expect(res.data.keys[0].publicKey).toStrictEqual(
        Buffer.from(pageKeypair.publicKey).toString("hex")
      );
    });

    // Create a new key page directly to the book
    const pageKeypair2 = Keypair.generate();
    const newKeyPageUrl2 = identity + "/" + randomString();
    const createKeyPage2 = {
      url: newKeyPageUrl2,
      keys: [pageKeypair2.publicKey],
    };

    const keyBook = new KeypairSigner(newKeyBookUrl, pageKeypair, { keyPageHeigt: 6 });

    await client.createKeyPage(createKeyPage2, keyBook);
    await waitOn(() => client.queryUrl(newKeyPageUrl2));

    // Test query key page index
    res = await client.queryKeyPageIndex(newKeyBookUrl, pageKeypair.publicKey);
    expect(res.data.index).toStrictEqual(0);
    res = await client.queryKeyPageIndex(newKeyBookUrl, pageKeypair2.publicKey);
    expect(res.data.index).toStrictEqual(1);

    // Test query tx history
    res = await client.queryTxHistory(keyPage.origin, { start: 0, count: 3 });
    expect(res.type).toStrictEqual("txHistory");
    expect(res.items.length).toStrictEqual(3);
    res = await client.queryTxHistory(keyPage.origin, { start: 0, count: res.total });
    expect(res.items.length).toStrictEqual(res.total);
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

  test("should get version", async () => {
    const res = await client.version();
    expect(res.type).toStrictEqual("version");
  });

  test("should get metrics", async () => {
    const res = await client.metrics("tps", 60);
    expect(res.type).toStrictEqual("metrics");
  });
});
