import { TxID, URL } from "../src/address";

test("should parse url", () => {
  const u = URL.parse("acc://authority/path");

  expect(u.authority).toStrictEqual("authority");
  expect(u.path).toStrictEqual("/path");
  expect(u.toString()).toStrictEqual("acc://authority/path");
});

test("should throw on non Accumulate URL", () => {
  expect(() => URL.parse("https://accumulatenetwork.io/")).toThrowError(/Invalid scheme/);
});

test("should append path", () => {
  const u = URL.parse("acc://authority");
  const tokenURL = URL.parse("acc://105251bb367baa372c748930531ae63d6e143c9aa4470eff/my-token");

  expect(u.join("next").toString()).toStrictEqual("acc://authority/next");
  expect(u.join("/next").toString()).toStrictEqual("acc://authority/next");
  expect(u.join(tokenURL).toString()).toStrictEqual(
    "acc://authority/105251bb367baa372c748930531ae63d6e143c9aa4470eff/my-token",
  );
});

describe("equality", () => {
  describe("for a URL", () => {
    it("should ignore case", () => {
      const a = URL.parse("acc://x@foo/BAR");
      const b = URL.parse("acc://X@FOO/bar");
      expect(a.equals(b)).toStrictEqual(true);
    });
  });
  describe("for a TxID", () => {
    it("should ignore case", () => {
      const a = TxID.parse("acc://x@foo/BAR");
      const b = TxID.parse("acc://X@FOO/bar");
      expect(a.equals(b)).toStrictEqual(true);
    });
  });
});
