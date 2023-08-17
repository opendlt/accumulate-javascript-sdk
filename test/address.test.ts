import { Address } from "../src/address";
import { SignatureType } from "../src/core";
import tests from "./data/address.json";

describe("addresses", () => {
  describe("public", () => {
    const cases = Object.entries(tests.public)
      .map(([key, value]) => ({ name: key, ...value }))
      .map(({ type, pubHash, ...rest }) => ({
        type: SignatureType.byName(type),
        pubHash: Buffer.from(pubHash, "hex"),
        ...rest,
      }));

    it.each(cases)("should format $name correctly", async ({ address, pubHash, type }) => {
      const addr = await Address.fromKeyHash(type, pubHash);
      expect(await addr.format()).toStrictEqual(address);
    });
  });
});
