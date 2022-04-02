import {
  ACME_TOKEN_URL,
  BN,
  Client,
  KeyPageOperation,
  KeyPageOperationType,
  Keypair,
  KeypairSigner,
  LiteAccount,
  RpcError,
} from "../src";
import { sha256 } from "../src/crypto";
import { addCredits, randomBuffer, randomString, waitOn } from "./util";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");
let acc: LiteAccount;
let identityUrl: string;
let identityKeyPage: KeypairSigner;

describe("Test Accumulate client", () => {
  beforeAll(async () => {
    /**
     *  Initialize a LiteAccount with credits
     */
    acc = LiteAccount.generate();
    await client.faucet(acc.url);
    await waitOn(async () => {
      const { data } = await client.queryUrl(acc.url);
      expect(data.type).toStrictEqual("liteTokenAccount");
    });

    await addCredits(client, acc.url, 60_000, acc);

    /**
     *  Initialize an identity
     */
    identityUrl = `acc://${randomString()}`;
    const identityKeypair = Keypair.generate();
    const bookUrl = identityUrl + "/my-book";

    // Create identity
    const createIdentity = {
      url: identityUrl,
      keyHash: sha256(identityKeypair.publicKey),
      keyBookUrl: bookUrl,
    };

    await client.createIdentity(acc.url, createIdentity, acc);
    await waitOn(() => client.queryUrl(identityUrl));

    const res = await client.queryUrl(identityUrl);
    expect(res.type).toStrictEqual("identity");

    const keyPageUrl = bookUrl + "/1";
    await addCredits(client, keyPageUrl, 600_000, acc);

    identityKeyPage = new KeypairSigner(keyPageUrl, identityKeypair);
  });

  test("should send tokens", async () => {
    const recipient = LiteAccount.generate();

    const amount = new BN(12);
    const sendTokens = { to: [{ url: recipient.url, amount: amount }] };
    const { txid } = await client.sendTokens(acc.url, sendTokens, acc);

    await waitOn(() => client.queryUrl(recipient.url));

    const { data } = await client.queryUrl(recipient.url);
    expect(new BN(data.balance)).toStrictEqual(amount);

    const res = await client.queryTx(txid);
    expect(res.type).toStrictEqual("sendTokens");
    expect(res.txid).toStrictEqual(txid);
  });

  test("should burn tokens", async () => {
    const { data } = await client.queryUrl(acc.url);
    const originalBalance = new BN(data.balance);

    const amount = new BN(15);
    const burnTokens = { amount };
    await client.burnTokens(acc.url, burnTokens, acc);

    await waitOn(async () => {
      const { data } = await client.queryUrl(acc.url);
      expect(new BN(data.balance)).toStrictEqual(originalBalance.sub(amount));
    });
  });

  test("should create token account", async () => {
    // Create token account
    const tokenAccountUrl = identityUrl + "/ACME";
    const createTokenAccount = {
      url: tokenAccountUrl,
      tokenUrl: ACME_TOKEN_URL,
    };
    await client.createTokenAccount(identityUrl, createTokenAccount, identityKeyPage);
    await waitOn(() => client.queryUrl(tokenAccountUrl));

    const res = await client.queryUrl(tokenAccountUrl);
    expect(res.type).toStrictEqual("tokenAccount");
  });

  test("should create key book and manage pages", async () => {
    // Create a new key book
    const page1Keypair = Keypair.generate();
    const newKeyBookUrl = identityUrl + "/" + randomString();
    const createKeyBook = {
      url: newKeyBookUrl,
      publicKeyHash: sha256(page1Keypair.publicKey),
    };

    await client.createKeyBook(identityUrl, createKeyBook, identityKeyPage);
    await waitOn(() => client.queryUrl(newKeyBookUrl));

    let res = await client.queryUrl(newKeyBookUrl);
    expect(res.type).toStrictEqual("keyBook");

    // verify page is part of the book
    const page1Url = newKeyBookUrl + "/1";
    res = await client.queryUrl(page1Url);
    expect(res.data.keyBook).toStrictEqual(newKeyBookUrl.toString());
    await addCredits(client, page1Url, 20_000, acc);

    let keyPage1 = new KeypairSigner(page1Url, page1Keypair);

    // Add new key to keypage
    const newKey = Keypair.generate();
    const addKeyToPage: KeyPageOperation = {
      type: KeyPageOperationType.Add,
      keyHash: sha256(newKey.publicKey),
    };

    await client.updateKeyPage(page1Url, addKeyToPage, keyPage1);
    await waitOn(async () => {
      const res = await client.queryUrl(page1Url);
      expect(res.data.keys.length).toStrictEqual(2);
    });

    // Update keypage
    let version = await client.querySignerVersion(keyPage1);
    keyPage1 = KeypairSigner.withNewVersion(keyPage1, version);
    const newNewKey = Keypair.generate();
    const updateKeyPage: KeyPageOperation = {
      type: KeyPageOperationType.Update,
      oldKeyHash: sha256(newKey.publicKey),
      newKeyHash: sha256(newNewKey.publicKey),
    };
    await client.updateKeyPage(page1Url, updateKeyPage, keyPage1);
    await waitOn(async () => {
      const res = await client.queryUrl(page1Url);
      expect(res.data.keys[1].publicKey).toStrictEqual(
        Buffer.from(sha256(newNewKey.publicKey)).toString("hex")
      );
    });

    // Set threshold
    // const setThreshold = {
    //   type: KeyPageOperationType.SetThreshold,
    //   threshold: 2,
    // };
    // keyPage = KeypairSigner.incrementKeyPageHeight(keyPage);
    // await client.updateKeyPage(setThreshold, keyPage);
    // await waitOn(async () => {
    //   const res = await client.queryUrl(newKeyPageUrl);
    //   expect(res.data.threshold).toStrictEqual(2);
    // });

    // Remove key from keypage
    version = await client.querySignerVersion(keyPage1);
    keyPage1 = KeypairSigner.withNewVersion(keyPage1, version);
    const removeKeyPage: KeyPageOperation = {
      type: KeyPageOperationType.Remove,
      keyHash: sha256(newNewKey.publicKey),
    };
    await client.updateKeyPage(page1Url, removeKeyPage, keyPage1);
    await waitOn(async () => {
      const res = await client.queryUrl(page1Url);
      expect(res.data.keys.length).toStrictEqual(1);
      expect(res.data.keys[0].publicKey).toStrictEqual(
        sha256(page1Keypair.publicKey).toString("hex")
      );
    });

    // Create a new key page to the book
    version = await client.querySignerVersion(keyPage1);
    keyPage1 = KeypairSigner.withNewVersion(keyPage1, version);
    const page2Keypair = Keypair.generate();
    const createKeyPage2 = {
      keys: [page2Keypair.publicKey],
    };

    await client.createKeyPage(newKeyBookUrl, createKeyPage2, keyPage1);
    const page2Url = newKeyBookUrl + "/2";
    await waitOn(() => client.queryUrl(page2Url));

    // Test query key page index
    res = await client.queryKeyPageIndex(newKeyBookUrl, page1Keypair.publicKey);
    expect(res.data.index).toStrictEqual(0);
    res = await client.queryKeyPageIndex(newKeyBookUrl, page2Keypair.publicKey);
    // TODO
    // expect(res.data.index).toStrictEqual(1);

    // Test query tx history
    res = await client.queryTxHistory(keyPage1.url, { start: 0, count: 3 });
    expect(res.type).toStrictEqual("txHistory");
    expect(res.items.length).toStrictEqual(3);
    res = await client.queryTxHistory(keyPage1.url, { start: 0, count: res.total });
    expect(res.items.length).toStrictEqual(res.total);
  });

  test("should create data account and write data", async () => {
    // Create data account
    const dataAccountUrl = identityUrl + "/my-data";
    const createDataAccount = {
      url: dataAccountUrl,
    };

    await client.createDataAccount(identityUrl, createDataAccount, identityKeyPage);
    await waitOn(() => client.queryUrl(dataAccountUrl));

    let res = await client.queryUrl(dataAccountUrl);
    expect(res.type).toStrictEqual("dataAccount");

    // Write data
    const data = [randomBuffer(), randomBuffer()];
    const writeData = {
      data,
    };

    await client.writeData(dataAccountUrl, writeData, identityKeyPage);
    await waitOn(async () => {
      const res = await client.queryData(dataAccountUrl);
      expect(res).toBeTruthy();
    });

    res = await client.queryData(dataAccountUrl);
    expect(res.type).toStrictEqual("dataEntry");
    expect(res.data.entry.data[0]).toStrictEqual(data[0].toString("hex"));
    expect(res.data.entry.data[1]).toStrictEqual(data[1].toString("hex"));
    expect(res.data.entry.data.length).toStrictEqual(2);
    const firstEntryHash = res.data.entryHash;

    const data2 = [randomBuffer()];
    const writeData2 = {
      data: data2,
    };
    await client.writeData(dataAccountUrl, writeData2, identityKeyPage);

    await waitOn(async () => {
      const res = await client.queryDataSet(dataAccountUrl, { start: 0, count: 10 });
      expect(res.items.length).toStrictEqual(2);
      expect(res.total).toStrictEqual(2);
    });

    // Query Data should now return the latest entry
    res = await client.queryData(dataAccountUrl);
    expect(res.data.entry.data[0]).toStrictEqual(data2[0].toString("hex"));
    expect(res.data.entry.data.length).toStrictEqual(1);
    // Query data per entry hash
    res = await client.queryData(dataAccountUrl, firstEntryHash);
    expect(res.data.entry.data[0]).toStrictEqual(data[0].toString("hex"));
  });

  test("should create token", async () => {
    const tokenUrl = identityUrl + "/TEST";
    const createToken = {
      url: tokenUrl,
      symbol: "TEST",
      precision: 0,
    };

    await client.createToken(identityUrl, createToken, identityKeyPage);
    await waitOn(() => client.queryUrl(tokenUrl));

    const recipient = LiteAccount.generateWithTokenUrl(tokenUrl);
    const amount = new BN(123);
    const issueToken = {
      recipient: recipient.url,
      amount,
    };

    await client.issueTokens(tokenUrl, issueToken, identityKeyPage);
    await waitOn(() => client.queryUrl(recipient.url));

    const { data } = await client.queryUrl(recipient.url);
    expect(new BN(data.balance)).toStrictEqual(amount);
  });

  test("should query directory", async () => {
    // This test result depends on execution of other identity tests
    // and should be positioned after those
    let res = await client.queryDirectory(identityUrl, { start: 0, count: 3 });
    expect(res.type).toStrictEqual("directory");
    expect(res.items.length).toStrictEqual(3);
    res = await client.queryDirectory(identityUrl, { start: 0, count: res.total });
    expect(res.items.length).toStrictEqual(res.total);
  });

  test("should get version", async () => {
    const res = await client.version();
    expect(res.type).toStrictEqual("version");
  });

  test("should call describe", async () => {
    const res = await client.describe();
    expect(res).toBeTruthy();
  });

  xtest("should get metrics", async () => {
    const res = await client.metrics("tps", 60);
    expect(res.type).toStrictEqual("metrics");
  });

  test("should reject unknown method", async () => {
    try {
      await client.call("unknown");
    } catch (e: any) {
      expect(e).toBeInstanceOf(RpcError);
      return;
    }
    throw "should have thrown";
  });

  test("should reject invalid path", async () => {
    try {
      const cli = new Client(
        (process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2") + "_unknown"
      );
      await cli.version();
    } catch (e: any) {
      expect(e.response.status).toStrictEqual(404);
      return;
    }
    throw "should have thrown";
  });
});
