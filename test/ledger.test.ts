import { openTransportReplayer, RecordStore } from "@ledgerhq/hw-transport-mocker";
import {
  LedgerAddress,
  LedgerAppName,
  LedgerSignature,
  LedgerVersion,
} from "../lib/ledger/model/results";
import { AddCredits, Transaction } from "../src/core";
import Accumulate from "../src/ledger";

test("getAppName", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e004000000
    <= 416363756d756c6174659000
    `),
  );

  //todo collect data from simulator
  const acme = new Accumulate(transport);
  const result = await acme.getAppName();

  const v = new LedgerAppName("Accumulate");

  //todo: change to appConfiguration to return internal states of the app, such as blind signing and version number
  expect(result.name).toEqual(v.name);
});

test("getAppConfiguration", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e003000000
    <= 0100039000
    `),
  );

  //todo collect data from simulator
  const acme = new Accumulate(transport);
  const result = await acme.getVersion();

  const v = new LedgerVersion(1, 0, 3);
  //todo: change to appConfiguration to return internal states of the app, such as blind signing and version number
  expect(result).toEqual(v);
});

test("getAddress", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e005000015058000002c80000119800000008000000080000000
    <= 20e55d973bf691381c94602354d1e1f655f7b1c4bd56760dffeffa2bef4541ec1120000000000000000000000000000000000000000000000000000000000000000035414331325756447a7036416f626456517359705156736639636e75553334435a7056636765663271676a4e704763665470664737479000
    `),
  );
  const acme = new Accumulate(transport);
  const result = await acme.getPublicKey("44'/281'/0'/0'/0'", false, false, "");
  const test = new LedgerAddress(
    "e55d973bf691381c94602354d1e1f655f7b1c4bd56760dffeffa2bef4541ec11",
    "AC12WVDzp6AobdVQsYpQVsf9cnuU34CZpVcgef2qgjNpGcfTpfG7G",
    "0000000000000000000000000000000000000000000000000000000000000000",
  );

  expect(result.address).toEqual(test.address);
  expect(result.publicKey).toEqual(test.publicKey);
  expect(result.chainCode).toEqual(test.chainCode);
});

//
// test("signTransaction for ETH type (rsv)", async () => {
//
// }

//
// test("signTransaction for BTC type", async () => {
//
// }

//
// test("signTransaction for FCT/RCD1 type", async () => {
//
// }

test("signTransaction for ACME type", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e006008015058000002c80000119800000008000000080000000
    <= 9000
    => e0060100d5016c01020220e55d973bf691381c94602354d1e1f655f7b1c4bd56760dffeffa2bef4541ec11041d6163633a2f2f6c6974652d746f6b656e2d6163636f756e742e61636d65050106d285d8cc0408039ce385b1c487a77139e19c296fdd63ae7e149260bc3853b245f8eec562c62603650140011d6163633a2f2f6c6974652d746f6b656e2d6163636f756e742e61636d6502b141868fcfc222e6d6b37a2aa8fe621e26f1a83d816b9d3cfc08a31898bdf5cb0221010e02136163633a2f2f6164692e61636d652f706167650303030d400480e1eb17
    <= 4050edaa8520374aa560845d797a35309caadd823427f4218c1ede364445b884d19671ab5546ab026c388887ec2986ef95e7eef71239bf1c5fc7e2eb040390dc0f009000
    `),
  );

  const env = Buffer.from(
    "AWwBAgIg5V2XO/aROByUYCNU0eH2VfexxL1Wdg3/7/or70VB7BEEHWFjYzovL2xpdGUtdG9rZW4tYWNjb3VudC5hY21lBQEG0oXYzAQIA5zjhbHEh6dxOeGcKW/dY65+FJJgvDhTskX47sVixiYDZQFAAR1hY2M6Ly9saXRlLXRva2VuLWFjY291bnQuYWNtZQKxQYaPz8Ii5tazeiqo/mIeJvGoPYFrnTz8CKMYmL31ywIhAQ4CE2FjYzovL2FkaS5hY21lL3BhZ2UDAwMNQASA4esX",
    "base64",
  );

  const acme = new Accumulate(transport);
  const result = await acme.signTransaction("44'/281'/0'/0'/0'", env.toString("hex"));
  const s = new LedgerSignature(
    "50edaa8520374aa560845d797a35309caadd823427f4218c1ede364445b884d19671ab5546ab026c388887ec2986ef95e7eef71239bf1c5fc7e2eb040390dc0f",
    false,
  );
  expect(result.signature).toEqual(s.signature);
});

test.skip("sign transaction with builder", async () => {
  const txn = new Transaction({
    header: {
      principal: "acc://lite-token-account.acme",
      initiator: "b141868fcfc222e6d6b37a2aa8fe621e26f1a83d816b9d3cfc08a31898bdf5cb",
    },
    body: new AddCredits({
      recipient: "acc://adi.acme/page",
      amount: "200000",
      oracle: 50000000,
    }),
  });

  // TODO I assume this needs to be changed to accommodate the getPublicKey call?
  const Ledger = new Accumulate(
    await openTransportReplayer(
      RecordStore.fromString(`
    => e006008015058000002c80000119800000008000000080000000
    <= 9000
    => e0060100d5016c01020220e55d973bf691381c94602354d1e1f655f7b1c4bd56760dffeffa2bef4541ec11041d6163633a2f2f6c6974652d746f6b656e2d6163636f756e742e61636d65050106d285d8cc0408039ce385b1c487a77139e19c296fdd63ae7e149260bc3853b245f8eec562c62603650140011d6163633a2f2f6c6974652d746f6b656e2d6163636f756e742e61636d6502b141868fcfc222e6d6b37a2aa8fe621e26f1a83d816b9d3cfc08a31898bdf5cb0221010e02136163633a2f2f6164692e61636d652f706167650303030d400480e1eb17
    <= 4050edaa8520374aa560845d797a35309caadd823427f4218c1ede364445b884d19671ab5546ab026c388887ec2986ef95e7eef71239bf1c5fc7e2eb040390dc0f009000
    `),
    ),
  );

  const signer = await Ledger.signerForPage("acc://lite-token-account.acme", "44'/281'/0'/0'/0'");
  const sig = await signer.withVersion(1).sign(txn, { timestamp: 1234567890 });
  const s = new LedgerSignature(
    "50edaa8520374aa560845d797a35309caadd823427f4218c1ede364445b884d19671ab5546ab026c388887ec2986ef95e7eef71239bf1c5fc7e2eb040390dc0f",
    false,
  );
  expect(Buffer.from(<ArrayBuffer>sig.signature).toString("hex")).toEqual(s.signature);
});
