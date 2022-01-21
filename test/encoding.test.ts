import {
  uvarintMarshalBinary,
  bytesMarshalBinary,
  stringMarshalBinary,
  bigNumberMarshalBinary,
} from "../src/encoding";
import { BN } from "bn.js";

test("should varint marshal binary BN numbers", () => {
  expect(uvarintMarshalBinary(0)).toStrictEqual(Buffer.from([0]));
  expect(uvarintMarshalBinary(1)).toStrictEqual(Buffer.from([1]));
  expect(uvarintMarshalBinary(127)).toStrictEqual(Buffer.from([127]));
  expect(uvarintMarshalBinary(128)).toStrictEqual(Buffer.from([128, 1]));
  expect(uvarintMarshalBinary(256)).toStrictEqual(Buffer.from([128, 2]));
  expect(uvarintMarshalBinary(Number.MAX_SAFE_INTEGER)).toStrictEqual(
    Buffer.from([255, 255, 255, 255, 255, 255, 255, 15])
  );

  // MAX_SAFE_INTEGER + 1
  expect(uvarintMarshalBinary(new BN(2).pow(new BN(53)))).toStrictEqual(
    Buffer.from([128, 128, 128, 128, 128, 128, 128, 16])
  );
  expect(uvarintMarshalBinary(new BN(2).pow(new BN(64)).sub(new BN(1)))).toStrictEqual(
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

test("should marshal binary BN", () => {
  expect(bigNumberMarshalBinary(new BN(0))).toStrictEqual(Buffer.from([1, 0]));
  expect(bigNumberMarshalBinary(new BN(255))).toStrictEqual(Buffer.from([1, 255]));
  expect(bigNumberMarshalBinary(new BN(256))).toStrictEqual(Buffer.from([2, 1, 0]));
  expect(bigNumberMarshalBinary(new BN(1486548674))).toStrictEqual(
    Buffer.from([4, 88, 154, 238, 194])
  );
});
