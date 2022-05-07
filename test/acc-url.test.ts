import { AccURL } from "../src/acc-url";

test("should parse url", () => {
  const u = AccURL.parse("acc://authority/path");

  expect(u.authority).toStrictEqual("authority");
  expect(u.path).toStrictEqual("/path");
  expect(u.toString()).toStrictEqual("acc://authority/path");
});

test("should throw on non Accumulate URL", () => {
  expect(() => AccURL.parse("https://accumulatenetwork.io/")).toThrowError(/Invalid protocol/);
});

test("should append path", () => {
  const u = AccURL.parse("acc://authority");
  const tokenURL = AccURL.parse("acc://105251bb367baa372c748930531ae63d6e143c9aa4470eff/my-token");

  expect(u.append("next").toString()).toStrictEqual("acc://authority/next");
  expect(u.append("/next").toString()).toStrictEqual("acc://authority/next");
  expect(u.append(tokenURL).toString()).toStrictEqual(
    "acc://authority/105251bb367baa372c748930531ae63d6e143c9aa4470eff/my-token"
  );
});
