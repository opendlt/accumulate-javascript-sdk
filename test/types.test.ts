import { Envelope } from "../new/core";
import { encode } from "../new/encoding";
import { transactions as transactionTests } from "./data/sdk/protocol.1.json";

describe.each(transactionTests)("transactions", ({ name, cases }) => {
  describe(name, () => {
    it.each<typeof cases[0]>(cases)("should marshal correctly", ({ json, binary }) => {
      const { signatures, transaction } = json as any;
      const env = new Envelope({ signatures, transaction: transaction });
      expect(encode(env)).toStrictEqual(Buffer.from(binary, "base64"));
    });
  });
});
