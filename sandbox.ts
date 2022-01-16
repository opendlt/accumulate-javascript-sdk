import { Keypair, Client, LiteAccount, AccURL, KeypairSigner } from ".";

const sk = Buffer.from(
  "d24c73abfd99dfbc2d10f5e987b8866b0d479742ca9904713aac0fa8f59f62cd2a8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f",
  "hex"
);
const kp = Keypair.fromSecretKey(sk);
const acc = LiteAccount.generateWithKeypair(kp);
console.log(acc.url.toString());

/////////////////////////

const kp2 = Keypair.fromSeed(
  Buffer.from("2a8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f", "hex")
);
const acc2 = LiteAccount.generateWithKeypair(kp2);
const recipient = acc2.url;
console.log("Sending to " + recipient);
// const sendTokens = { to: [{ url: recipient, amount: 1000000000 }] };

/////////////////////////
// const addCredits = {
//   recipient: acc.url,
//   amount: 100,
// };
/////////////////////////

const kpIdentity = Keypair.fromSeed(
  Buffer.from("aa8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f", "hex")
);
const identity = new KeypairSigner(AccURL.parse("acc://luap"), kpIdentity);

console.log("pk identity " + Buffer.from(identity.publicKey).toString("hex"));

console.log("Identity " + identity);
// const createIdentity = {
//   url: identity.origin,
//   publicKey: kpIdentity.publicKey,
//   keyBookName: "luap-book",
//   keyPageName: "luap-page",
// };
/////////////////////////
// const tokenAccount = identity.url + "/ACME"
// const createTokenAccount = {
//   url: tokenAccount,
//   tokenUrl: ACME_TOKEN_URL.toString(),
// };
/////////////////////////
// const anotherKey = Keypair.fromSeed(
//   Buffer.from("aa8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f", "hex")
// );
// const keyPage = new KeypairSigner(identity.origin + "/luap-page2", anotherKey, {keyPageHeigt: 2});

// const createKeyPage = {
//   url: keyPage.origin,
//   keys: [anotherKey.publicKey],
// };
/////////////////////////
const keyBookUrl = "acc://luap/my-book"
// const keyBook = new KeypairSigner(keyBookUrl, anotherKey, {keyPageHeigt: 2});

// const createKeyBook = {
//   url: keyBookUrl,
//   pages: [identity.origin + "/luap-page2"]
// }
///////////////////////////
// const createKeyPage2 = {
//   url: identity.origin + "/luap-page3",
//   keys: [Keypair.generate().publicKey],
// };
/////////////////////////
// const anotherKey2 = Keypair.fromSeed(
//   Buffer.from("128d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f", "hex")
// );

// const addKeyPage = {
//   operation: 3,
//   newKey: anotherKey2.publicKey,
// }
// const removeKeyPage = {
//   operation: 2,
//   key: anotherKey2.publicKey,
// }
// const updateKeyPage = {
//   operation: 1,
//   key: anotherKey.publicKey,
//   newKey: anotherKey2.publicKey,
// }
/////////////////////////
// const createDataAccount = {
//   url: "acc://luap/my-data",
// };
// const dataAccout = new KeypairSigner(createDataAccount.url, kpIdentity);
/////////////////////////
// const writeData = {
//   extIds: [],
//   data: Buffer.from("hello2")
// }
////////////////
// const createToken = {
//   url: identity.url + "/LUAP",
//   symbol: "LUAP-yolo",
//   precision: 0,

// }
////////////////

const client = new Client("http://127.0.1.1:26660/v2");

// const sendTokensToLuap = { to: [{ url: identity + "/ACME6", amount: 100000000 }] };
// const sendTokensToAcc2 = { to: [{ url: acc2.url, amount: 100000000 }] };
// const signer = new KeypairSigner(tokenAccount, kpIdentity);

async function run() {
  // await client.faucet(acc.url);
  // await client.version();
  // await client.queryUrl(acc.url);
  // await client.addCredits(addCredits, acc);
  // await client.sendTokens(sendTokens, acc);
  // await client.createIdentity(createIdentity, acc);
  // await client.queryTx("8fab9dbdfc7e6a66568898d3a88300070ef23e06df368edb0388fda77656f3a1");
  // await client.createTokenAccount(createTokenAccount, identity);
  // await client.queryUrl("acc://400fbe3fd7e86b3891c3ddb5/p/b69fb2a685c2b3894734fb0a");
  // await client.queryDirectory(identity.origin, { start: 0, count: 10 });
  // await client.queryUrl("acc://df9ad7f007e643c29a20e736a3a5f9d31be4395584277143/ACME");
  // await client.sendTokens(sendTokensToLuap, acc);
  // await client.sendTokens(sendTokensToAcc2, signer);
  // await client.createKeyPage(createKeyPage, identity);
  // await client.queryUrl(identity.url + "/luap-page");
  // await client.queryUrl(identity + "/luap-book");
  // await client.createKeyBook(createKeyBook, identity);
  // await client.createKeyPage(createKeyPage2, keyBook);
  await client.queryUrl(keyBookUrl);
  // await client.queryUrl(keyPage.origin);
  // await client.updateKeyPage(addKeyPage, keyPage);
  // await client.updateKeyPage(removeKeyPage, keyPage);
  // await client.updateKeyPage(updateKeyPage, keyPage);
  // await client.createDataAccount(createDataAccount, identity);
  // await client.queryUrl(createDataAccount.url);
  // await client.writeData(writeData, dataAccout);
  // await client.queryData(dataAccout.url)
  // await client.queryDataSet(dataAccout.url, {start: 0, count: 10})
  // await client.queryTxHistory(dataAccout.url, {start: 0, count: 2});
  // await client.queryKeyPageIndex(dataAccout.url, kpIdentity.publicKey);
  // await client.queryKeyPageIndex(identity.url, kpIdentity.publicKey);
  // await client.createToken(createToken, identity);
  // await client.queryDataSet("acc://302e37313538/my-data", { start: 0, count: 10 });

  // await client.queryUrl("acc://972d820e73d85a5d17a8d590")
  // await client.queryKeyPageIndex("acc://434916a60c3b306af1d24635", Buffer.from("1ed7f73c25f7b1585cfe87cee172152344e62238a54817faddd2b1bda520e3af", "hex"));

}

run();
