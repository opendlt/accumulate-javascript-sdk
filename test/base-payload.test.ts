import { BasePayload } from "../src/payload/base-payload";

class TestPayload extends BasePayload {
  _counter = 0;

  protected _marshalBinary(): Buffer {
    this._counter++;
    return Buffer.from("test");
  }
}

test("should cache marshal binary result", () => {
  const payload = new TestPayload();
  const bin = payload.marshalBinary();

  expect(bin).toStrictEqual(Buffer.from("test"));
  expect(payload._counter).toStrictEqual(1);

  const bin2 = payload.marshalBinary();
  expect(bin2).toStrictEqual(Buffer.from("test"));
  expect(payload._counter).toStrictEqual(1);
});
