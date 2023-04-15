/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ChildProcess } from "child_process";
import treeKill from "tree-kill";
import { ACME_TOKEN_URL, BN, Client, RpcError, TransactionType } from "../src";
import {
  AccountAuthOperation,
  AccountAuthOperationType,
  CreateKeyPage,
  KeyPageOperation,
  KeyPageOperationType,
  WriteData,
} from "../src/core";
import { sha256 } from "../src/crypto";
import { ED25519KeypairSigner, LiteSigner, PageSigner } from "../src/signing";
import { constructIssuerProof } from "../src/util";
import { addCredits, randomBuffer, randomLiteIdentity, randomString, startSim } from "./util";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");
let lid: LiteSigner;
let identityUrl: string;
let identityKeyPageTxSigner: PageSigner;

let sim: ChildProcess;
beforeAll(async () => await startSim((p) => (sim = p)));
afterAll(() => sim?.pid && treeKill(sim.pid));

describe("Test Accumulate client", () => {
  beforeAll(async () => {
    /**
     *  Initialize a LiteIdentity with credits
     */
    lid = randomLiteIdentity();
    const txres = await client.faucet(lid.acmeTokenAccount);
    await client.waitOnTx(txres.txid!.toString());

    // Assert lite identity and lite token account type
    let res = await client.queryUrl(lid.url);
    expect(res.data.type).toStrictEqual("liteIdentity");
    res = await client.queryUrl(lid.acmeTokenAccount);
    expect(res.data.type).toStrictEqual("liteTokenAccount");

    await addCredits(client, lid.url, 60_000, lid);

    /**
     *  Initialize an identity
     */
    identityUrl = `acc://${randomString()}.acme`;
    const identitySigner = ED25519KeypairSigner.generate();
    const bookUrl = identityUrl + "/my-book";

    // Create identity
    const createIdentity = {
      url: identityUrl,
      keyHash: identitySigner.publicKeyHash,
      keyBookUrl: bookUrl,
    };

    res = await client.createIdentity(lid.url, createIdentity, lid);
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(identityUrl);
    expect(res.type).toStrictEqual("identity");

    const keyPageUrl = bookUrl + "/1";
    await addCredits(client, keyPageUrl, 600_000, lid);

    identityKeyPageTxSigner = new PageSigner(keyPageUrl, identitySigner);
  });

  test("should send tokens", async () => {
    const recipient = randomLiteIdentity().acmeTokenAccount;

    const amount = new BN(12);
    const sendTokens = { to: [{ url: recipient, amount: amount }] };
    const { txid } = await client.sendTokens(lid.acmeTokenAccount, sendTokens, lid);

    await client.waitOnTx(txid);

    const { data } = await client.queryUrl(recipient);
    expect(new BN(data.balance)).toStrictEqual(amount);

    let res = await client.queryTx(txid);
    expect(res.type).toStrictEqual("sendTokens");
    expect(res.txid).toStrictEqual(txid);

    // test query with just hash
    res = await client.queryTx(txid.slice(6).split("@")[0]);
    expect(res.type).toStrictEqual("sendTokens");
    expect(res.txid).toStrictEqual(txid);
  });

  test("should burn tokens", async () => {
    let res = await client.queryUrl(lid.acmeTokenAccount);
    const originalBalance = new BN(res.data.balance);

    const amount = new BN(15);
    const burnTokens = { amount };
    res = await client.burnTokens(lid.acmeTokenAccount, burnTokens, lid);

    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(lid.acmeTokenAccount);
    expect(new BN(res.data.balance)).toStrictEqual(originalBalance.sub(amount));
  });

  test("should create an ACME token account", async () => {
    // Create token account
    const tokenAccountUrl = identityUrl + "/ACME";
    const createTokenAccount = {
      url: tokenAccountUrl,
      tokenUrl: ACME_TOKEN_URL,
    };
    let res = await client.createTokenAccount(
      identityUrl,
      createTokenAccount,
      identityKeyPageTxSigner
    );
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(tokenAccountUrl);
    expect(res.type).toStrictEqual("tokenAccount");
  });

  test("should create key book and manage pages", async () => {
    // Create a new key book
    const page1Signer = ED25519KeypairSigner.generate();
    const newKeyBookUrl = identityUrl + "/" + randomString();
    const createKeyBook = {
      url: newKeyBookUrl,
      publicKeyHash: page1Signer.publicKeyHash,
    };

    let res = await client.createKeyBook(identityUrl, createKeyBook, identityKeyPageTxSigner);
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(newKeyBookUrl);
    expect(res.type).toStrictEqual("keyBook");

    // verify page is part of the book
    const page1Url = newKeyBookUrl + "/1";
    res = await client.queryUrl(page1Url);
    expect(res.data.keyBook).toStrictEqual(newKeyBookUrl.toString());
    await addCredits(client, page1Url, 20_000, lid);

    let keyPage1TxSigner = new PageSigner(page1Url, page1Signer);

    // Add new key to keypage
    const newKey = ED25519KeypairSigner.generate();
    const addKeyToPage: KeyPageOperation.Args = {
      type: KeyPageOperationType.Add,
      entry: { keyHash: newKey.publicKeyHash },
    };

    res = await client.updateKeyPage(page1Url, addKeyToPage, keyPage1TxSigner);
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(page1Url);
    expect(res.data.keys.length).toStrictEqual(2);

    // Update keyhash in keypage
    let version = await client.querySignerVersion(keyPage1TxSigner);
    keyPage1TxSigner = PageSigner.withNewVersion(keyPage1TxSigner, version);
    const newNewKey = ED25519KeypairSigner.generate();
    const updateKeyPage: KeyPageOperation.Args = {
      type: KeyPageOperationType.Update,
      oldEntry: { keyHash: newKey.publicKeyHash },
      newEntry: { keyHash: newNewKey.publicKeyHash },
    };
    res = await client.updateKeyPage(page1Url, updateKeyPage, keyPage1TxSigner);
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(page1Url);
    const newKeyHash = Buffer.from(newNewKey.publicKeyHash).toString("hex");
    const found = res.data.keys
      .map((k: any) => k.publicKey)
      .find((pk: string) => pk === newKeyHash);
    expect(found).not.toBeUndefined();

    // Set threshold
    // const setThreshold: KeyPageOperation = {
    //   type: KeyPageOperationType.SetThreshold,
    //   threshold: 2,
    // };
    // version = await client.querySignerVersion(keyPage1);
    // keyPage1 = KeypairSigner.withNewVersion(keyPage1, version);
    // let res = await client.updateKeyPage(page1Url, setThreshold, keyPage1);
    // await client.waitOnTx(res.txid!.toString());
    // res = await client.queryUrl(page1Url);
    // expect(res.data.threshold).toStrictEqual(2);

    // Remove key from keypage
    version = await client.querySignerVersion(keyPage1TxSigner);
    keyPage1TxSigner = PageSigner.withNewVersion(keyPage1TxSigner, version);
    const removeKeyPage: KeyPageOperation.Args = {
      type: KeyPageOperationType.Remove,
      entry: { keyHash: newNewKey.publicKeyHash },
    };
    res = await client.updateKeyPage(page1Url, removeKeyPage, keyPage1TxSigner);
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(page1Url);
    expect(res.data.keys.length).toStrictEqual(1);
    expect(res.data.keys[0].publicKey).toStrictEqual(
      Buffer.from(page1Signer.publicKeyHash).toString("hex")
    );

    // Create a new key page to the book
    version = await client.querySignerVersion(keyPage1TxSigner);
    keyPage1TxSigner = PageSigner.withNewVersion(keyPage1TxSigner, version);
    const page2Signer = ED25519KeypairSigner.generate();
    const createKeyPage2: CreateKeyPage.Args = {
      keys: [{ keyHash: sha256(page2Signer.publicKey) }],
    };

    res = await client.createKeyPage(newKeyBookUrl, createKeyPage2, keyPage1TxSigner);
    await client.waitOnTx(res.txid!.toString());

    const page2Url = newKeyBookUrl + "/2";

    // Update allowed
    const updateAllowed: KeyPageOperation.Args = {
      type: KeyPageOperationType.UpdateAllowed,
      deny: [TransactionType.UpdateKeyPage],
    };

    res = await client.updateKeyPage(page2Url, updateAllowed, keyPage1TxSigner);
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(page2Url);
    expect(res.data.transactionBlacklist).toStrictEqual(["updateKeyPage"]);

    const updateAllowed2: KeyPageOperation.Args = {
      type: KeyPageOperationType.UpdateAllowed,
      allow: [TransactionType.UpdateKeyPage],
    };

    res = await client.updateKeyPage(page2Url, updateAllowed2, keyPage1TxSigner);
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(page2Url);
    expect(res.data.transactionBlacklist).toBeUndefined();

    // Test query key page index
    res = await client.queryKeyPageIndex(newKeyBookUrl, page1Signer.publicKey);
    expect(res.data.index).toStrictEqual(0);
    res = await client.queryKeyPageIndex(newKeyBookUrl, page2Signer.publicKey);
    // TODO
    // expect(res.data.index).toStrictEqual(1);

    // Test query tx history
    res = await client.queryTxHistory(keyPage1TxSigner.url, { start: 0, count: 3 });
    expect(res.type).toStrictEqual("txHistory");
    expect(res.items.length).toStrictEqual(3);
    res = await client.queryTxHistory(keyPage1TxSigner.url, { start: 0, count: res.total });
    expect(res.items.length).toStrictEqual(res.total);
  });

  test("should create data account and write data", async () => {
    // Create data account
    const dataAccountUrl = identityUrl + "/my-data";
    const createDataAccount = {
      url: dataAccountUrl,
    };

    let res = await client.createDataAccount(
      identityUrl,
      createDataAccount,
      identityKeyPageTxSigner
    );
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(dataAccountUrl);
    expect(res.type).toStrictEqual("dataAccount");

    // Write data
    const data = [randomBuffer(), randomBuffer(), randomBuffer()];
    const writeData: WriteData.Args = {
      entry: {
        type: "doubleHash",
        data: data,
      },
    };

    res = await client.writeData(dataAccountUrl, writeData, identityKeyPageTxSigner);
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryData(dataAccountUrl);
    expect(res).toBeTruthy();

    res = await client.queryData(dataAccountUrl);
    expect(res.type).toStrictEqual("dataEntry");
    expect(res.data.entry.data[0]).toStrictEqual(data[0].toString("hex"));
    expect(res.data.entry.data[1]).toStrictEqual(data[1].toString("hex"));
    expect(res.data.entry.data[2]).toStrictEqual(data[2].toString("hex"));
    expect(res.data.entry.data.length).toStrictEqual(3);
    const firstEntryHash = res.data.entryHash;

    const data2 = [randomBuffer(), randomBuffer(), randomBuffer(), randomBuffer(), randomBuffer()];
    const writeData2: WriteData.Args = {
      entry: {
        type: "doubleHash",
        data: data2,
      },
    };
    res = await client.writeData(dataAccountUrl, writeData2, identityKeyPageTxSigner);
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryDataSet(dataAccountUrl, { start: 0, count: 10 });
    expect(res.items.length).toStrictEqual(2);
    expect(res.total).toStrictEqual(2);

    // Query Data should now return the latest entry
    res = await client.queryData(dataAccountUrl);
    expect(res.data.entry.data[0]).toStrictEqual(data2[0].toString("hex"));
    expect(res.data.entry.data.length).toStrictEqual(5);
    // Query data per entry hash
    res = await client.queryData(dataAccountUrl, firstEntryHash);
    expect(res.data.entry.data[0]).toStrictEqual(data[0].toString("hex"));
  });

  test("should create token and token account for it", async () => {
    const tokenUrl = identityUrl + "/TEST";
    const createToken = {
      url: tokenUrl,
      symbol: "TEST",
      precision: 0,
    };

    let res = await client.createToken(identityUrl, createToken, identityKeyPageTxSigner);
    const createTokenTxId = res.txid;
    await client.waitOnTx(createTokenTxId);

    const recipient = new LiteSigner(ED25519KeypairSigner.generate()).url.join(tokenUrl);
    const amount = new BN(123);
    const issueToken = {
      to: [{ url: recipient, amount }],
    };

    res = await client.issueTokens(tokenUrl, issueToken, identityKeyPageTxSigner);
    await client.waitOnTx(res.txid!.toString());

    const { data } = await client.queryUrl(recipient);
    expect(new BN(data.balance)).toStrictEqual(amount);

    // Create a token account for the TEST token
    const tokenAccountUrl = identityUrl + "/TEST2";
    const createTokenAccount = {
      url: tokenAccountUrl,
      tokenUrl,
      proof: await constructIssuerProof(client, tokenUrl),
    };
    res = await client.createTokenAccount(identityUrl, createTokenAccount, identityKeyPageTxSigner);

    await client.waitOnTx(res.txid, { timeout: 10_000 });

    res = await client.queryUrl(tokenAccountUrl);
    expect(res.type).toStrictEqual("tokenAccount");
  });

  test("should update keypage key", async () => {
    const newKey = ED25519KeypairSigner.generate();
    const updateKey = {
      newKeyHash: newKey.publicKeyHash,
    };

    let res = await client.updateKey(
      identityKeyPageTxSigner.url,
      updateKey,
      identityKeyPageTxSigner
    );
    await client.waitOnTx(res.txid!.toString());

    res = await client.queryUrl(identityKeyPageTxSigner.url);
    expect(res.data.keys[0].publicKeyHash).toStrictEqual(
      Buffer.from(newKey.publicKeyHash).toString("hex")
    );
  });

  xtest("should update account auth", async () => {
    // Disable
    const disable: AccountAuthOperation.Args = {
      type: AccountAuthOperationType.Disable,
      authority: identityKeyPageTxSigner.url,
    };

    const res = await client.updateAccountAuth(
      identityKeyPageTxSigner.url,
      disable,
      identityKeyPageTxSigner
    );
    await client.waitOnTx(res.txid!.toString());

    // // Enable
    // const enable: AccountAuthOperation = {
    //   type: AccountAuthOperationType.Enable,
    //   authority: identityKeyPageTxSigner.url,
    // };

    // res = await client.updateAccountAuth(
    //   identityKeyPageTxSigner.url,
    //   enable,
    //   identityKeyPageTxSigner
    // );
    // await waitOn(async () => client.queryTx(res.txid));

    // // Add authority
    // const addAuthority: AccountAuthOperation = {
    //   type: AccountAuthOperationType.AddAuthority,
    //   authority: "xxxxxx",
    // };

    // res = await client.updateAccountAuth(
    //   identityKeyPageTxSigner.url,
    //   addAuthority,
    //   identityKeyPageTxSigner
    // );
    // await waitOn(async () => client.queryTx(res.txid));

    // // Remove authority
    // const removeAuthority: AccountAuthOperation = {
    //   type: AccountAuthOperationType.RemoveAuthority,
    //   authority: "xxxxxx",
    // };

    // res = await client.updateAccountAuth(
    //   identityKeyPageTxSigner.url,
    //   removeAuthority,
    //   identityKeyPageTxSigner
    // );
    // await waitOn(async () => client.queryTx(res.txid));
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

  test("should call status", async () => {
    const res = await client.status();
    expect(res).toBeTruthy();
  });

  xtest("should get metrics", async () => {
    const res = await client.metrics("tps", 60);
    expect(res.type).toStrictEqual("metrics");
  });

  test("should query major blocks", async () => {
    const res = await client.queryMajorBlocks(identityUrl, { count: 1, start: 0 });
    expect(res).toBeTruthy();
  });

  test("should query minor blocks", async () => {
    const res = await client.queryMinorBlocks(
      identityUrl,
      { count: 1, start: 0 },
      {
        txFetchMode: "ids",
        blockFilterMode: "excludenone",
      }
    );
    expect(res).toBeTruthy();
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
});
