import { ED25519Key } from "../src/signing";

test("should create keypair from secret key", async () => {
  const kp1 = await ED25519Key.generate();
  const kp2 = await ED25519Key.from(kp1.address.privateKey);

  expect(kp1.address.publicKey).toStrictEqual(kp2.address.publicKey);
});
