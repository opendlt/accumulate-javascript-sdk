import { Header } from "../src/transaction";

test("should marshall binary Header", () => {
  const header = new Header("acc://hello", {
    nonce: 55,
  });

  expect(header.marshalBinary()).toStrictEqual(
    Buffer.from([11, 97, 99, 99, 58, 47, 47, 104, 101, 108, 108, 111, 1, 0, 55])
  );
});

// test("should marshall binary Transaction", () => {
//   const header = new Header("acc://hello", {
//     nonce: 55,
//   });
//   const tx = new Transaction();

//   expect(tx.marshalBinary()).toStrictEqual(Buffer.from([0]));
// });
