import { Header } from "../src/transaction";

test("should populate timestamp", () => {
  const header = new Header("acc://hello");

  expect(header.timestamp).toBeGreaterThan(0);
});

// test("should marshal binary Header", () => {
//   const header = new Header("acc://hello", {
//     timestamp: 55,
//   });

//   expect(header.marshalBinary()).toStrictEqual(
//     Buffer.from([1, 11, 97, 99, 99, 58, 47, 47, 104, 101, 108, 108, 111, 2, 1, 4, 55])
//   );
// });

// test("should marshal binary Transaction", () => {
//   const header = new Header("acc://hello", {
//     nonce: 55,
//   });
//   const tx = new Transaction();

//   expect(tx.marshalBinary()).toStrictEqual(Buffer.from([0]));
// });
