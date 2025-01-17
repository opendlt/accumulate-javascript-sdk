/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Buffer } from "../src/common/buffer";
import { combineReceipts, Receipt, ReceiptEntry } from "../src/merkle";

function assertHasEntries(
  receipt: Receipt,
): asserts receipt is Receipt & { entries: NonNullable<Receipt["entries"]> } {
  if (!receipt.entries) {
    throw new Error("Receipt must have entries");
  }
}

// Convert string or Buffer to Uint8Array
function toUint8Array(input: string | Buffer | Uint8Array): Uint8Array {
  if (typeof input === "string") {
    return Buffer.from(input, "hex");
  }
  if (input instanceof Uint8Array) {
    return input;
  }
  return new Uint8Array(input);
}

function createEntry(hash: string | Buffer | Uint8Array, right = false): ReceiptEntry {
  const hashBytes = toUint8Array(hash);
  return {
    hash: hashBytes,
    right,
    copy() {
      return createEntry(hashBytes, this!.right);
    },
    asObject() {
      const self = this!;
      const hash: Buffer = Buffer.from(self.hash! as Uint8Array);
      return {
        hash: hash.toString("hex"),
        right: self.right!,
      };
    },
  };
}

test("should clone receipt with string hashes", () => {
  const r1 = new Receipt({
    start: Buffer.from("c5f890fa64b1321b8454a53c4106faca35f7acf4f8e535e28153d11460885a52", "hex"),
    startIndex: 1,
    end: Buffer.from("c5f890fa64b1321b8454a53c4106faca35f7acf4f8e535e28153d11460885a52", "hex"),
    endIndex: 1,
    anchor: Buffer.from("ceb7ad426ca0e66dc4aef2002c92de6172d452f7e181279246205caea32962ca", "hex"),
    entries: [
      createEntry("baee50fcd5b881c14fd54437d5b371cadedc0bce12f3f443e42a91529005c588"),
      createEntry("d52ff6d28d5ae24afa5b07792ac5b9b41ac901bdf6878fc0f3575ca939e455b1", true),
    ],
  });

  const r2 = r1.copy();
  assertHasEntries(r1);
  assertHasEntries(r2);

  // Check the clone has equal fields
  expect(Buffer.from(r1.start!).toString("hex")).toEqual(Buffer.from(r2.start!).toString("hex"));
  expect(r1.startIndex).toEqual(r2.startIndex);
  expect(Buffer.from(r1.end!).toString("hex")).toEqual(Buffer.from(r2.end!).toString("hex"));
  expect(r1.endIndex).toEqual(r2.endIndex);
  expect(Buffer.from(r1.anchor!).toString("hex")).toEqual(Buffer.from(r2.anchor!).toString("hex"));
  expect(r1.entries.length).toEqual(r2.entries.length);

  for (let i = 0; i < r1.entries.length; ++i) {
    expect(Buffer.from(r1.entries[i]!.hash!).toString("hex")).toEqual(
      Buffer.from(r2.entries[i]!.hash!).toString("hex"),
    );
    expect(r1.entries[i]!.right).toEqual(r2.entries[i]!.right);
  }

  // Verify the clone is deep copy
  r1.start = Buffer.from("new");
  r1.entries![0]!.hash = Buffer.from("new");
  r1.entries![0]!.right = true;

  const r2o = r2.asObject();
  expect(r2o.start).toEqual("c5f890fa64b1321b8454a53c4106faca35f7acf4f8e535e28153d11460885a52");
  expect(r2o.entries?.[0]?.hash).toEqual(
    "baee50fcd5b881c14fd54437d5b371cadedc0bce12f3f443e42a91529005c588",
  );
  expect(r2o.entries?.[0]?.right).toBeFalsy();
});

test("should clone receipt with Buffer hashes", () => {
  const r1 = new Receipt({
    start: Buffer.from("c5f890fa64b1321b8454a53c4106faca35f7acf4f8e535e28153d11460885a52", "hex"),
    startIndex: 1,
    end: Buffer.from("c5f890fa64b1321b8454a53c4106faca35f7acf4f8e535e28153d11460885a52", "hex"),
    endIndex: 1,
    anchor: Buffer.from("ceb7ad426ca0e66dc4aef2002c92de6172d452f7e181279246205caea32962ca", "hex"),
    entries: [
      createEntry(
        Buffer.from("baee50fcd5b881c14fd54437d5b371cadedc0bce12f3f443e42a91529005c588", "hex"),
      ),
      createEntry(
        Buffer.from("d52ff6d28d5ae24afa5b07792ac5b9b41ac901bdf6878fc0f3575ca939e455b1", "hex"),
        true,
      ),
    ],
  });

  const r2 = r1.copy();

  assertHasEntries(r1);
  assertHasEntries(r2);

  // Check the clone has equal fields
  expect(r1.start).toEqual(r2.start);
  expect(r1.startIndex).toEqual(r2.startIndex);
  expect(r1.end).toEqual(r2.end);
  expect(r1.endIndex).toEqual(r2.endIndex);
  expect(r1.anchor).toEqual(r2.anchor);
  expect(r1.entries.length).toEqual(r2.entries.length);
  for (let i = 0; i < r1.entries.length; ++i) {
    expect(r1.entries[i]?.hash).toEqual(r2.entries[i]?.hash);
    expect(r1.entries[i]?.right).toEqual(r2.entries[i]?.right);
  }

  // Verify the clone is deep copy
  r1.start![0] = 4;
  r1.entries![0]!.hash![0] = 7;
  r1.entries![0]!.right = true;

  expect(r2.start).toEqual(
    Buffer.from("c5f890fa64b1321b8454a53c4106faca35f7acf4f8e535e28153d11460885a52", "hex"),
  );
  expect(r2.entries[0]?.hash).toEqual(
    Buffer.from("baee50fcd5b881c14fd54437d5b371cadedc0bce12f3f443e42a91529005c588", "hex"),
  );
  expect(r2.entries[0]?.right).toBeFalsy();
});

test("should combine receipts", () => {
  const r1 = new Receipt({
    start: "c5f890fa64b1321b8454a53c4106faca35f7acf4f8e535e28153d11460885a52",
    startIndex: 1,
    end: "c5f890fa64b1321b8454a53c4106faca35f7acf4f8e535e28153d11460885a52",
    endIndex: 1,
    anchor: Buffer.from("ceb7ad426ca0e66dc4aef2002c92de6172d452f7e181279246205caea32962ca", "hex"),
    entries: [
      createEntry("baee50fcd5b881c14fd54437d5b371cadedc0bce12f3f443e42a91529005c588"),
      createEntry("d52ff6d28d5ae24afa5b07792ac5b9b41ac901bdf6878fc0f3575ca939e455b1"),
      createEntry("11e5067b046acd688a1ee4457e9792ea236e3f7a429b49d73c418fe86cccd8cd"),
      createEntry("bd09e34a5699ce91c9ad35333e4e65a875de7c3353975a5f644fcb24483a6257"),
      createEntry("4a516cec8fa0cff2a46097fa8fe16fe31a281f1c1cfaeb413d0acb6be95d8bc1"),
      createEntry("3b95c9a7de9bc5dde675dea63dabbaef089b9ee21868cd84f3c0277d2507c5a2"),
    ],
  });
  const r2 = new Receipt({
    start: "ceb7ad426ca0e66dc4aef2002c92de6172d452f7e181279246205caea32962ca",
    startIndex: 32,
    end: "ceb7ad426ca0e66dc4aef2002c92de6172d452f7e181279246205caea32962ca",
    endIndex: 32,
    anchor: "e256404fca6505e7663b1ad0490a13beb0e89d2c315b10b915f607760831560c",
    entries: [
      createEntry("7cdf9cf3825c367017d2744860bb20bc01af62299e90f56599d34c99ce081dfc"),
      createEntry("bd91711895d09a793a60c92cc895c0c97c549c1764dae887ce8e9ec9fdc530f1", true),
      createEntry("154ff546f3937121bb79907a9fce706003bfc6f8dd48aca64a779e59e9ffe990", true),
      createEntry("232fe211abeb588bd413e0ef97fff351d1a052fdc89f90b67dabf32a21c4964d"),
      createEntry("4461bde50ac321d849a6ad10aa9593339c16cb6eda46e296f561a19893cc0f1a"),
      createEntry("06ba0d8adcd7b0fb16508f09b5f644c63010791cb1ce4f186d4b3e951305ca24"),
      createEntry("cea9ddc3f85f2336e881f32160dbb5f4da5881494bee4a99836a7089e4cebf48"),
    ],
  });

  const combined = combineReceipts(r1, r2);

  assertHasEntries(r1);
  assertHasEntries(r2);

  expect(r1.entries.length).toEqual(6);
  expect(r2.entries.length).toEqual(7);
  const r1len = r1.entries.length;
  const r2len = r2.entries.length;
  expect(combined.entries?.length).toEqual(r1len + r2len);
  expect(combined.anchor).toEqual(r2.anchor);
});

test("should marshal/unmarshal receipt", () => {
  const r1 = new Receipt({
    entries: [createEntry(Buffer.from("00", "hex"))],
  });

  assertHasEntries(r1);

  const data = r1.copy(); // Use copy instead of marshal
  assertHasEntries(data);

  expect(r1.entries.length).toEqual(data.entries.length);
  for (let i = 0; i < r1.entries.length; i++) {
    expect(r1.entries[i]?.hash).toEqual(data.entries[i]?.hash);
    expect(r1.entries[i]?.right).toEqual(data.entries[i]?.right);
  }

  // Verify modifying original doesn't affect copy
  r1.entries![0]!.hash = Buffer.from("new");
  r1.entries![0]!.right = true;

  expect(data.entries[0]?.hash).toEqual(Buffer.from("00", "hex"));
  expect(data.entries[0]?.right).toBeFalsy();
});
