import { openTransportReplayer, RecordStore } from "@ledgerhq/hw-transport-mocker";
import {
  LedgerAddress,
  LedgerAppName,
  LedgerSignature,
  LedgerVersion,
} from "../lib/ledger/model/results";
import Accumulate from "../src/ledger";

test("getAppName", async () => {
  const transport = await openTransportReplayer(
    RecordStore.fromString(`
    => e004000000
    <= 416363756d756c6174659000
    `)
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
    `)
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
    `)
  );
  const acme = new Accumulate(transport);
  const result = await acme.getPublicKey("44'/281'/0'/0'/0'", false, false, "");
  const test = new LedgerAddress(
    "e55d973bf691381c94602354d1e1f655f7b1c4bd56760dffeffa2bef4541ec11",
    "AC12WVDzp6AobdVQsYpQVsf9cnuU34CZpVcgef2qgjNpGcfTpfG7G",
    "0000000000000000000000000000000000000000000000000000000000000000"
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
    `)
  );
  //e0060100d50                                          16c01020220e55d973bf691381c94602354d1e1f655f7b1c4bd56760dffeffa2bef4541ec11041d6163633a2f2f6c6974652d746f6b656e2d6163636f756e742e61636d65050106d285d8cc0408039ce385b1c487a77139e19c296fdd63ae7e149260bc3853b245f8eec562c62603650140011d6163633a2f2f6c6974652d746f6b656e2d6163636f756e742e61636d6502b141868fcfc222e6d6b37a2aa8fe621e26f1a83d816b9d3cfc08a31898bdf5cb0221010e02136163633a2f2f6164692e61636d652f706167650303030d400480e1eb17
  //e0060000ea058000002c80000119800000008000000080000000016c01020220e55d973bf691381c94602354d1e1f655f7b1c4bd56760dffeffa2bef4541ec11041d6163633a2f2f6c6974652d746f6b656e2d6163636f756e742e61636d65050106d285d8cc0408039ce385b1c487a77139e19c296fdd63ae7e149260bc3853b245f8eec562c62603650140011d6163633a2f2f6c6974652d746f6b656e2d6163636f756e742e61636d6502b141868fcfc222e6d6b37a2aa8fe621e26f1a83d816b9d3cfc08a31898bdf5cb0221010e02136163633a2f2f6164692e61636d652f706167650303030d400480e1eb17
  //e006008040058000002c80000119800000008000000080000000016c01020220e55d973bf691381c94602354d1e1f655f7b1c4bd56760dffeffa2bef4541ec11041d616363

  const env = Buffer.from(
    "AWwBAgIg5V2XO/aROByUYCNU0eH2VfexxL1Wdg3/7/or70VB7BEEHWFjYzovL2xpdGUtdG9rZW4tYWNjb3VudC5hY21lBQEG0oXYzAQIA5zjhbHEh6dxOeGcKW/dY65+FJJgvDhTskX47sVixiYDZQFAAR1hY2M6Ly9saXRlLXRva2VuLWFjY291bnQuYWNtZQKxQYaPz8Ii5tazeiqo/mIeJvGoPYFrnTz8CKMYmL31ywIhAQ4CE2FjYzovL2FkaS5hY21lL3BhZ2UDAwMNQASA4esX",
    "base64"
  );

  const acme = new Accumulate(transport);
  const result = await acme.signTransaction("44'/281'/0'/0'/0'", env.toString("hex"));
  const s = new LedgerSignature(
    "50edaa8520374aa560845d797a35309caadd823427f4218c1ede364445b884d19671ab5546ab026c388887ec2986ef95e7eef71239bf1c5fc7e2eb040390dc0f",
    false
  );
  expect(result.signature).toEqual(s.signature);
});
//
// test("signTransaction supports EIP1559 with tokens", async () => {
//   const transport = await openTransportReplayer(
//     RecordStore.fromString(`
//     => e00a000066035a5258e41d2489571d322189246dafa5ebde1f4699f4980000001200000001304402200ae8634c22762a8ba41d2acb1e068dcce947337c6dd984f13b820d396176952302203306a49d8a6c35b11a61088e1570b3928ca3a0db6bd36f577b5ef87628561ff7
//     <= 9000
//     => e00400008c058000002c8000003c80000000000000000000000002f8740106843b9aca008504a817c80082520894e41d2489571d322189246dafa5ebde1f4699f498872386f26fc10000b844095ea7b3000000000000000000000000221657776846890989a759ba2973e427dff5c9bb0000000000000000000000000000000000000000000000004563918244f40000c0
//     <= 00d6814aa5db69de910824b14462af006fde864224c616ab93e30f646e7309a93f0312ac6e580e918ce6e39e5f910cb95ba7b68167f4d71e581dec2495a198ecc09000
//     `)
//   );
//   const eth = new Eth(transport);
//   const result = await eth.signTransaction(
//     "44'/60'/0'/0/0",
//     "02f8740106843b9aca008504a817c80082520894e41d2489571d322189246dafa5ebde1f4699f498872386f26fc10000b844095ea7b3000000000000000000000000221657776846890989a759ba2973e427dff5c9bb0000000000000000000000000000000000000000000000004563918244f40000c0"
//   );
//   expect(result).toEqual({
//     r: "d6814aa5db69de910824b14462af006fde864224c616ab93e30f646e7309a93f",
//     s: "0312ac6e580e918ce6e39e5f910cb95ba7b68167f4d71e581dec2495a198ecc0",
//     v: "00",
//   });
// });
//
// test("signTransaction supports EIP2930", async () => {
//   const transport = await openTransportReplayer(
//     RecordStore.fromString(`
//     => e004000096058000002c8000003c80000000000000000000000001f886030685012a05f20082520894b2bb2b958afa2e96dab3f3ce7162b87daea39017872386f26fc1000080f85bf85994de0b295669a9fd93d5f28d9ec85e40f4cb697baef842a00000000000000000000000000000000000000000000000000000000000000003a0000000000000000000000000000000000000000000000000
//     <= 9000
//     => e0048000080000000000000007
//     <= 01a74d82400f49d1f9d85f734c22a1648d4ab74bb6367bef54c6abb0936be3d8b77a84a09673394c3c1bd76be05620ee17a2d0ff32837607625efa433cc017854e9000
//     `)
//   );
//   const eth = new Eth(transport);
//   const result = await eth.signTransaction(
//     "44'/60'/0'/0/0",
//     "01f886030685012a05f20082520894b2bb2b958afa2e96dab3f3ce7162b87daea39017872386f26fc1000080f85bf85994de0b295669a9fd93d5f28d9ec85e40f4cb697baef842a00000000000000000000000000000000000000000000000000000000000000003a00000000000000000000000000000000000000000000000000000000000000007"
//   );
//   expect(result).toEqual({
//     r: "a74d82400f49d1f9d85f734c22a1648d4ab74bb6367bef54c6abb0936be3d8b7",
//     s: "7a84a09673394c3c1bd76be05620ee17a2d0ff32837607625efa433cc017854e",
//     v: "01",
//   });
// });
