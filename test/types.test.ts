import { Account } from "../src/core";
import { encode } from "../src/encoding";
import { Envelope } from "../src/messaging";
import {
  accounts as accountTests,
  transactions as transactionTests,
} from "./data/sdk/protocol.1.json";

describe.each(transactionTests)("transactions", ({ name, cases }) => {
  if (name.startsWith("Synthetic")) {
    return;
  }

  describe(name, () => {
    it.each<typeof cases[0]>(cases)("should marshal correctly", ({ json, binary }) => {
      const { signatures, transaction } = json as any;
      const env = new Envelope({ signatures, transaction: transaction });
      expect(encode(env)).toStrictEqual(Buffer.from(binary, "base64"));
    });
  });
});

describe.each(accountTests)("accounts", ({ name, cases }) => {
  if (name === "KeyBook") {
    return;
  }

  describe(name, () => {
    it.each<typeof cases[0]>(cases)("should marshal correctly", ({ json, binary }) => {
      const account = Account.fromObject(json as any);
      expect(encode(account)).toStrictEqual(Buffer.from(binary, "base64"));
    });
  });
});
