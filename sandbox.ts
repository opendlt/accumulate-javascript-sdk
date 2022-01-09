import { Keypair, Client, LiteAccount, AccURL, OriginSigner } from ".";

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
const identity = new OriginSigner(AccURL.parse("acc://luap"), kpIdentity);

console.log("pk identity " + Buffer.from(identity.publicKey).toString("hex"));

console.log("Identity " + identity);
// const createIdentity = {
//   url: identity.url,
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
// const book = new OriginSigner(AccURL.parse("acc://luap/luap-book"), kpIdentity);

// const anotherKey = Keypair.fromSeed(
//   Buffer.from("aa8d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f", "hex")
// );
// const keyPage = new OriginSigner(identity.url + "/luap-page2", anotherKey);

// const createKeyPage = {
//   url: keyPage.url,
//   keys: [anotherKey.publicKey],
// };
/////////////////////////
// const createKeyBook = {
//   url: "acc://luap/my-book",
//   pages: [identity.url + "/luap-page2"]
// }
/////////////////////////

// const anotherKey2 = Keypair.fromSeed(
//   Buffer.from("128d9c138157cee634352772aa2cf8ab50d6d5cb69064550ba06abe63eabcb8f", "hex")
// );

// const addKeyPage = {
//   operation: 2,
//   // key: anotherKey.publicKey,
//   newKey: anotherKey2.publicKey,
// }
// const removeKeyPage = {
//   operation: 3,
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
// const dataAccout = new OriginSigner(createDataAccount.url, kpIdentity);
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
// const signer = new OriginSigner(tokenAccount, kpIdentity);

async function run() {
  // await client.faucet(acc.url);
  // await client.version();
  // await client.queryUrl(acc.url);
  // await client.addCredits(addCredits, acc);
  // await client.sendTokens(sendTokens, acc);
  // await client.createIdentity(createIdentity, acc);
  // await client.queryTx("39b6274c7924da01f66bbf0eb40daad2d6cd4ffc6843dbae9f047ca33385c3ab");
  // await client.createTokenAccount(createTokenAccount, identity);
  await client.queryUrl("acc://luap/ACME");
  // await client.queryDirectory(identity.url, { start: 0, count: 10 });
  // await client.queryUrl("acc://df9ad7f007e643c29a20e736a3a5f9d31be4395584277143/ACME");
  // await client.sendTokens(sendTokensToLuap, acc);
  // await client.sendTokens(sendTokensToAcc2, signer);
  // await client.createKeyPage(createKeyPage, identity);
  // await client.queryUrl(identity.url + "/luap-page");
  // await client.queryUrl(identity + "/luap-book");
  // await client.createKeyBook(createKeyBook, identity);
  // await client.queryUrl(identity.url + "/my-book");
  // await client.queryUrl(keyPage);
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
}

run();
