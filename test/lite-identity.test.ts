import { Buffer } from "../src/common/buffer";
import { ED25519Key, Signer } from "../src/signing";

test("should compute correct lite ACME token account URL", async () => {
  const seed = Buffer.from(
    "a362b69a6cda241bf6b949faffb3bffbf1a47291373590660644f5c572feae72",
    "hex",
  );

  const keypair = await ED25519Key.from(seed);
  const liteIdentity = await Signer.forLite(keypair);
  expect(liteIdentity.url.toString()).toBe(
    "acc://105251bb367baa372c748930531ae63d6e143c9aa4470eff",
  );
});
