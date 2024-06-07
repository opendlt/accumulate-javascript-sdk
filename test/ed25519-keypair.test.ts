import { sha256 } from "../src/common";
import { ED25519Signature } from "../src/core";
import { ED25519Key } from "../src/signing";

describe("ed25519 key", () => {
  test("should create keypair from secret key", async () => {
    const kp1 = await ED25519Key.generate();
    const kp2 = await ED25519Key.from(kp1.address.privateKey);

    expect(kp1.address.publicKey).toStrictEqual(kp2.address.publicKey);
  });

  test("should be able to sign with imported key", async () => {
    const kp1 = await ED25519Key.generate();
    const kp2 = await ED25519Key.from(kp1.address.privateKey);

    const msg = await sha256(Buffer.from("test", "utf-8"));

    const sig = await kp2.signRaw(new ED25519Signature({}), msg);
    console.log(Buffer.from(sig).toString("hex"));
  });
});
