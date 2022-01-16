import { Keypair } from "../src/keypair";

test("should copy keypair from constructor", () => {
  const kp1 = Keypair.generate();
  const kp2 = new Keypair(kp1);

  expect(kp1.publicKey).toStrictEqual(kp2.publicKey);
});

test("should create keypair from secret key", () => {
  const kp1 = Keypair.generate();
  const kp2 = Keypair.fromSecretKey(kp1.secretKey);

  expect(kp1.publicKey).toStrictEqual(kp2.publicKey);
});
