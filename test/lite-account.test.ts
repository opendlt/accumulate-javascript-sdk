import { Keypair } from "../src/keypair";
import { LiteAccount } from "../src/lite-account";

test("should compute correct lite account URL", () => {
  const seed = Buffer.from(
    "a362b69a6cda241bf6b949faffb3bffbf1a47291373590660644f5c572feae72",
    "hex"
  );

  const keypair = Keypair.fromSeed(seed);
  const liteAccount = LiteAccount.generateWithKeypair(keypair);
  expect(liteAccount.url.toString()).toBe(
    "acc://105251bb367baa372c748930531ae63d6e143c9aa4470eff/ACME"
  );
});
