import * as ecc from "tiny-secp256k1";
import { bip44, ED25519Key } from "../src";

const mnemonic =
  "yellow yellow yellow yellow yellow yellow yellow yellow yellow yellow yellow yellow";

const fromHexString = (hexString: any) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte: any) => parseInt(byte, 16)));

const wallet = {
  Factom: bip44.NewWalletFromMnemonic(ecc, mnemonic, bip44.CoinType.FactomFactoids),
  Acme: bip44.NewWalletFromMnemonic(ecc, mnemonic, bip44.CoinType.Accumulate),
  Btc: bip44.NewWalletFromMnemonic(ecc, mnemonic, bip44.CoinType.Bitcoin),
  Eth: bip44.NewWalletFromMnemonic(ecc, mnemonic, bip44.CoinType.Ether),
};

describe("bip44 key derivation", () => {
  test("should create factom key from bip44", async () => {
    const checkKey = new Buffer(
      "36422e9560f56e0ead53a83b33aec9571d379291b5e292b88dec641a98ef05d8",
      "hex",
    );

    const kp1 = await ED25519Key.from(checkKey);
    const kp2 = await ED25519Key.from(wallet.Factom.getKey(0, 0, 0).privateKey);

    expect(kp1.address.publicKey).toEqual(kp2.address.publicKey);

    //now test deriving from the path
    const kp3 = await ED25519Key.from(
      wallet.Factom.getKeyFromPath(bip44.makePath(bip44.CoinType.FactomFactoids, 0, 0, 0))
        .privateKey,
    );
    expect(kp2.address.publicKey).toStrictEqual(kp3.address.publicKey);
  });

  test("should create acme key from bip44", async () => {
    const checkKey = new Buffer(
      "a2fd3e3b8c130edac176da83dcf809e22a01ab5a853560806e6cc054b3e160b0",
      "hex",
    );
    const kp1 = await ED25519Key.from(checkKey);
    const kp2 = await ED25519Key.from(wallet.Acme.getKey(0, 0, 0).privateKey);

    expect(kp1.address.publicKey).toStrictEqual(kp2.address.publicKey);

    const kp3 = await ED25519Key.from(
      wallet.Acme.getKeyFromPath(bip44.makePath(bip44.CoinType.Accumulate, 0, 0, 0)).privateKey,
    );
    expect(kp2.address.publicKey).toStrictEqual(kp3.address.publicKey);
  });

  test("should create bitcoin key from bip44", async () => {
    const pubKey0 = fromHexString(
      "02f7aa1eb14de438735c026c7cc719db11baf82e47f8fa2c86b55bff92b677eae2",
    );
    const pubKey1 = await ecc.pointFromScalar(wallet.Btc.getKey(0, 0, 0).privateKey);
    const pubKey2 = await ecc.pointFromScalar(
      wallet.Btc.getKeyFromPath(bip44.makePath(bip44.CoinType.Bitcoin, 0, 0, 0)).privateKey,
    );

    expect(pubKey0).toStrictEqual(pubKey1);
    expect(pubKey0).toStrictEqual(pubKey2);
  });

  test("should create ethereum key from bip44", async () => {
    const pubKey0 = fromHexString(
      "02c4755e0a7a0f7082749bf46cdae4fcddb784e11428446a01478d656f588f94c1",
    );
    const pubKey1 = await ecc.pointFromScalar(wallet.Eth.getKey(0, 0, 0).privateKey);
    const pubKey2 = await ecc.pointFromScalar(
      wallet.Eth.getKeyFromPath(bip44.makePath(bip44.CoinType.Ether, 0, 0, 0)).privateKey,
    );

    expect(pubKey0).toStrictEqual(pubKey1);
    expect(pubKey0).toStrictEqual(pubKey2);
  });
});
