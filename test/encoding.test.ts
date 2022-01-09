import { uvarintMarshalBinary, bytesMarshalBinary, stringMarshalBinary } from "../src/encoding";
import { u64 } from "../src/bigint";
import { BN } from "bn.js";

test("should varint marshal binary u64 numbers", () => {
  expect(uvarintMarshalBinary(0)).toStrictEqual(Buffer.from([0]));
  expect(uvarintMarshalBinary(1)).toStrictEqual(Buffer.from([1]));
  expect(uvarintMarshalBinary(127)).toStrictEqual(Buffer.from([127]));
  expect(uvarintMarshalBinary(128)).toStrictEqual(Buffer.from([128, 1]));
  expect(uvarintMarshalBinary(256)).toStrictEqual(Buffer.from([128, 2]));
  expect(uvarintMarshalBinary(Number.MAX_SAFE_INTEGER)).toStrictEqual(
    Buffer.from([255, 255, 255, 255, 255, 255, 255, 15])
  );

  // MAX_SAFE_INTEGER + 1
  expect(uvarintMarshalBinary(new u64(2).pow(new u64(53)))).toStrictEqual(
    Buffer.from([128, 128, 128, 128, 128, 128, 128, 16])
  );
  expect(uvarintMarshalBinary(new u64(2).pow(new u64(64)).sub(new BN(1)))).toStrictEqual(
    Buffer.from([255, 255, 255, 255, 255, 255, 255, 255, 255, 1])
  );
});

test("should throw on number input greater than MAX_SAFE_INTEGER", () => {
  expect(() => uvarintMarshalBinary(Number.MAX_SAFE_INTEGER + 1)).toThrowError(
    /Cannot marshal binary number greater than MAX_SAFE_INTEGER/
  );
});

test("should marshal binary bytes arrays", () => {
  expect(bytesMarshalBinary(Buffer.from([]))).toStrictEqual(Buffer.from([0]));
  expect(bytesMarshalBinary(Buffer.from([0, 1, 2, 3]))).toStrictEqual(Buffer.from([4, 0, 1, 2, 3]));
});

test("should marshal binary strings", () => {
  expect(stringMarshalBinary()).toStrictEqual(Buffer.from([0]));
  expect(stringMarshalBinary("")).toStrictEqual(Buffer.from([0]));
  expect(stringMarshalBinary("hello")).toStrictEqual(Buffer.from([5, 104, 101, 108, 108, 111]));
});
