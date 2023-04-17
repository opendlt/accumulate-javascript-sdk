import { Ed25519Keypair } from "../src/signing/ed25519-keypair";
import { ED25519KeypairSigner } from "../src/signing/ed25519-keypair-signer";
import { LiteSigner } from "../src/signing/signer";

test("should compute correct lite ACME token account URL", async () => {
  const seed = Buffer.from(
    "a362b69a6cda241bf6b949faffb3bffbf1a47291373590660644f5c572feae72",
    "hex"
  );

  const keypair = Ed25519Keypair.fromSeed(seed);
  const liteIdentity = await LiteSigner.from(new ED25519KeypairSigner(keypair));
  expect(liteIdentity.acmeTokenAccount.toString()).toBe(
    "acc://105251bb367baa372c748930531ae63d6e143c9aa4470eff/ACME"
  );
});
