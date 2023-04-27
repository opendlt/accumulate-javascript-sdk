import { api_v2, ED25519Key, Signer } from "accumulate.js";

(async function () {
  const client = new api_v2.Client("https://mainnet.accumulatenetwork.io/v2");

  // Generate a random Signer (this is only local, until that account receive its first tokens)
  const lid = await Signer.forLite(await ED25519Key.generate());
  // Request some ACME token to get started from the faucet
  let res = await client.faucet(lid.url.join("ACME"));
  await client.waitOnTx(res.txid.toString());

  // check the ACME token balance
  console.log(await client.queryUrl(lid.url.join("ACME")));

  // Convert some tokens into credits necessary to perform operations on Accumulate
  const oracle = await client.queryAcmeOracle();
  const addCredits = {
    recipient: lid.url,
    amount: 1000 * 1e8,
    oracle,
  };
  res = await client.addCredits(lid.url.join("ACME"), addCredits, lid);
  await client.waitOnTx(res.txid.toString());

  // check the credits balance
  console.log(await client.queryUrl(lid.url));

  // Send some tokens to another random Lite ACME token Account
  const recipient = await Signer.forLite(await ED25519Key.generate());
  const sendTokens = { to: [{ url: recipient.url.join("ACME"), amount: 12 }] };
  res = await client.sendTokens(lid.url.join("ACME"), sendTokens, lid);
  await client.waitOnTx(res.txid.toString());

  // Now with the credits we can create an Accumulate Digital Identifier (ADI)
  // which is one of the fundamental feature of the network

  const identitySigner = await ED25519Key.generate(); // Root signer that will control the identity
  const identityUrl = "acc://my-own-identity.acme";
  const bookUrl = identityUrl + "/my-book";

  const createIdentity = {
    url: identityUrl,
    keyHash: identitySigner.address.publicKeyHash,
    keyBookUrl: bookUrl,
  };

  res = await client.createIdentity(lid.url, createIdentity, lid);
  await client.waitOnTx(res.txid.toString());

  // check your identity
  console.log(await client.queryUrl(identityUrl));

  // Instantiate a PageSigner that can now sign transactions on behalf of this identity
  // (after receiving credits on the identity initial key page)
  const keyPageUrl = bookUrl + "/1";
  const addCredits2 = {
    recipient: keyPageUrl,
    amount: 1000 * 1e8,
    oracle,
  };
  res = await client.addCredits(lid.url.join("ACME"), addCredits2, lid);
  await client.waitOnTx(res.txid.toString());
  const identityKeyPage = await Signer.forPage(keyPageUrl, identitySigner);
})();
