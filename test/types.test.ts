import { transactions as transactionTests } from "./data/sdk/protocol.1.json";
import { TransactionBody, Transaction, Envelope, ED25519Sig } from "../src/types";

const userTransactionTests = transactionTests.filter(v => !v.name.startsWith('Synthetic') && v.name != 'AcmeFaucet');

describe.each(userTransactionTests)("transactions", ({ name, cases }) => {
  describe(name, () => {
    it.each(cases)("should marshal correctly", ({ json, binary }) => {
      const { body, ...header } = json.transaction;
      const env = new Envelope({
        signatures: json.signatures.map(v => new ED25519Sig(v)),
        transaction: new Transaction({
          ...header,
          keyPageIndex: 0,
          body: TransactionBody.from(body),
        })
      });
      expect(env.marshalBinary()).toStrictEqual(Buffer.from(binary, 'base64'));
    })
  })
})