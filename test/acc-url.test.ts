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
