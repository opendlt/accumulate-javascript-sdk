import { Address } from "../src/address";
import { SignatureType } from "../src/core";
import tests from "./data/address.json";

describe("addresses", () => {
  describe("public key hash", () => {
    const cases = Object.entries(tests.public)
      .map(([key, value]) => ({ name: key, ...value }))
      .map(({ type, pubHash, ...rest }) => ({
        type: SignatureType.byName(type),
        pubHash: Buffer.from(pubHash, "hex"),
        ...rest,
      }));

    it.each(cases)("should format $name correctly", ({ address, pubHash, type }) => {
      const addr = Address.fromKeyHash(type, pubHash);
      expect(addr.toString()).toStrictEqual(address);
    });
  });

  it("should format ETH public keys correctly", () => {
    const pub = Buffer.from(
      "045b665446274e74465cd0e65af948a5b6ea70ef8485dd10bab282297c0393141e5d355b55ca790cb6daf9a08f9c35f603bb4241b892dc507f52671956f710acf8",
      "hex"
    );
    const addr = Address.fromKey(SignatureType.ETH, pub);
    expect(addr.toString()).toStrictEqual("0xf7e8538b1333c6f6fb95e650f04e16dc840703e4");
  });
});
