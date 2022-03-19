import { Envelope, LegacyED25519Signature, Transaction, TransactionBody } from "../src/types";
import { transactions as transactionTests } from "./data/sdk/protocol.1.json";

const userTransactionTests = transactionTests.filter(
  (v) => !v.name.startsWith("Synthetic") && v.name != "AcmeFaucet"
);

describe.each(userTransactionTests)("transactions", ({ name, cases }) => {
  describe(name, () => {
    it.each(cases)("should marshal correctly", ({ json, binary }) => {
      const { body, header } = json.transaction;
      const env = new Envelope({
        signatures: json.signatures.map((v) => new LegacyED25519Signature(v)),
        transaction: new Transaction({ header, body: TransactionBody.from(body) }),
      });
      expect(env.marshalBinary()).toStrictEqual(Buffer.from(binary, "base64"));
    });
  });
});
