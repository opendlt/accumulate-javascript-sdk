import { Ed25519Keypair } from "../src/signing/ed25519-keypair";

test("should copy keypair from constructor", () => {
  const kp1 = Ed25519Keypair.generate();
  const kp2 = new Ed25519Keypair(kp1);

  expect(kp1.publicKey).toStrictEqual(kp2.publicKey);
});

test("should create keypair from secret key", () => {
  const kp1 = Ed25519Keypair.generate();
  const kp2 = Ed25519Keypair.fromSecretKey(kp1.secretKey);

  expect(kp1.publicKey).toStrictEqual(kp2.publicKey);
});
