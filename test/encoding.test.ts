import {
  bigNumberMarshalBinary,
  booleanMarshalBinary,
  bytesMarshalBinary,
  fieldMarshalBinary,
  hashMarshalBinary,
  stringMarshalBinary,
  uvarintMarshalBinary,
  varintMarshalBinary,
} from "../src/encoding/encoding";

test("should uvarint marshal binary BN numbers", () => {
  expect(uvarintMarshalBinary(0)).toStrictEqual(Buffer.from([0]));
  expect(uvarintMarshalBinary(0, 7)).toStrictEqual(Buffer.from([7, 0]));
  expect(uvarintMarshalBinary(1)).toStrictEqual(Buffer.from([1]));
  expect(uvarintMarshalBinary(127)).toStrictEqual(Buffer.from([127]));
  expect(uvarintMarshalBinary(128)).toStrictEqual(Buffer.from([128, 1]));
  expect(uvarintMarshalBinary(256)).toStrictEqual(Buffer.from([128, 2]));
  expect(uvarintMarshalBinary(Number.MAX_SAFE_INTEGER)).toStrictEqual(
    Buffer.from([255, 255, 255, 255, 255, 255, 255, 15])
  );

  // MAX_SAFE_INTEGER + 1
  expect(uvarintMarshalBinary(2n ** 53n)).toStrictEqual(
    Buffer.from([128, 128, 128, 128, 128, 128, 128, 16])
  );
  expect(uvarintMarshalBinary(2n ** 64n - 1n)).toStrictEqual(
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
  expect(stringMarshalBinary("")).toStrictEqual(Buffer.from([0]));
  expect(stringMarshalBinary("hello")).toStrictEqual(Buffer.from([5, 104, 101, 108, 108, 111]));
});

test("should marshal binary BN", () => {
  expect(bigNumberMarshalBinary(0n)).toStrictEqual(Buffer.from([1, 0]));
  expect(bigNumberMarshalBinary(255n)).toStrictEqual(Buffer.from([1, 255]));
  expect(bigNumberMarshalBinary(256n)).toStrictEqual(Buffer.from([2, 1, 0]));
  expect(bigNumberMarshalBinary(1486548674n)).toStrictEqual(Buffer.from([4, 88, 154, 238, 194]));
});

test("should marshal binary boolean", () => {
  expect(booleanMarshalBinary(true)).toStrictEqual(Buffer.from([1]));
  expect(booleanMarshalBinary(false)).toStrictEqual(Buffer.from([0]));
});

test("should marshal binary hash", () => {
  const hash = Buffer.from([
    0x18, 0x94, 0xa1, 0x9c, 0x85, 0xba, 0x15, 0x3a, 0xcb, 0xf7, 0x43, 0xac, 0x4e, 0x43, 0xfc, 0x00,
    0x4c, 0x89, 0x16, 0x04, 0xb2, 0x6f, 0x8c, 0x69, 0xe1, 0xe8, 0x3e, 0xa2, 0xaf, 0xc7, 0xc4, 0x8f,
  ]);
  expect(hashMarshalBinary(hash)).toStrictEqual(hash);
  expect(() => hashMarshalBinary(Buffer.from([0]))).toThrowError(
    /Invalid length, value is not a hash/
  );
});

test("should marshal field", () => {
  expect(fieldMarshalBinary(1, booleanMarshalBinary(true))).toStrictEqual(Buffer.from([1, 1]));
  expect(fieldMarshalBinary(2, booleanMarshalBinary(false))).toStrictEqual(Buffer.from([2, 0]));
});

test("should varint marshal binary BN numbers", () => {
  expect(varintMarshalBinary(0)).toStrictEqual(Buffer.from([0]));
  expect(varintMarshalBinary(1)).toStrictEqual(Buffer.from([2]));
  expect(varintMarshalBinary(-1)).toStrictEqual(Buffer.from([1]));
  expect(varintMarshalBinary(128)).toStrictEqual(Buffer.from([128, 2]));
  expect(varintMarshalBinary(-64)).toStrictEqual(Buffer.from([127]));
});
