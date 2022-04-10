import { ACME_TOKEN_URL } from "../src/acme";
import { LiteAccount } from "../src/lite-account";
import { Ed25519Keypair } from "../src/signing/ed25519-keypair";
import { Ed25519KeypairSigner } from "../src/signing/ed25519-keypair-signer";

test("should compute correct lite account URL", () => {
  const seed = Buffer.from(
    "a362b69a6cda241bf6b949faffb3bffbf1a47291373590660644f5c572feae72",
    "hex"
  );

  const keypair = Ed25519Keypair.fromSeed(seed);
  const liteAccount = new LiteAccount(new Ed25519KeypairSigner(keypair), ACME_TOKEN_URL);
  expect(liteAccount.url.toString()).toBe(
    "acc://105251bb367baa372c748930531ae63d6e143c9aa4470eff/ACME"
  );
});
