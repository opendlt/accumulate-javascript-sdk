import { ED25519Key } from "../src";
import { Buffer } from "../src/common/buffer";
import { ED25519Signature } from "../src/core";

class SignableMessage {
  constructor(private message: Uint8Array) {}

  hash(): Uint8Array {
    return this.message;
  }
}

test("should create key pair from private key", async () => {
  const priv = Buffer.from(
    "0000000000000000000000000000000000000000000000000000000000000000",
    "hex",
  );
  const expectedPub = new Uint8Array(
    Buffer.from("3b6a27bcceb6a42d62a3a8d02a6f0d73653215771de243a63ac048a18b59da29", "hex"),
  );

  const kp1 = await ED25519Key.from(priv);
  const kp2 = await ED25519Key.from(priv);

  expect(new Uint8Array(kp1.address.publicKey)).toStrictEqual(expectedPub);
  expect(new Uint8Array(kp2.address.publicKey)).toStrictEqual(expectedPub);

  const msg = new Uint8Array([0, 1, 2, 3]);
  const signable = new SignableMessage(msg);
  const sig = await kp2.signRaw(new ED25519Signature({}), signable);

  expect(sig).toHaveLength(64);
});
