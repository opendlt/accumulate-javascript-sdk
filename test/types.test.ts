import { encode } from "../src/encoding";
import { Envelope } from "../src/messaging";
import { transactions as transactionTests } from "./data/sdk/protocol.1.json";

const tests = transactionTests.filter((x) => !x.name.startsWith("Synthetic"));

describe.each(tests)("transactions", ({ name, cases }) => {
  describe(name, () => {
    it.each<typeof cases[0]>(cases)("should marshal correctly", ({ json, binary }) => {
      const { signatures, transaction } = json as any;
      const env = new Envelope({ signatures, transaction: transaction });
      expect(encode(env)).toStrictEqual(Buffer.from(binary, "base64"));
    });
  });
});
