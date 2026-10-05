import { createHash } from "crypto";
import { Buffer } from "../src/common/buffer";
import * as core from "../src/core";
import { encode } from "../src/encoding";
import * as messaging from "../src/messaging";
import vectorData from "./data/go-encoding-vectors.json";

/**
 * The SDK's binary encoding must be byte-for-byte what the network's Go code writes, or every hash and signature built
 * from it disagrees with the chain's. Each vector in data/go-encoding-vectors.json is an object as Go marshals it to
 * JSON, with the bytes Go's MarshalBinary produced for it (gitlab.com/accumulatenetwork/accumulate, the commit Kermit
 * runs). The SDK must rebuild the object from that JSON and encode it to exactly those bytes.
 */
type Vector = { name: string; json: any; binary: string; hash?: string };
const vectors = vectorData as Vector[];
const vector = (name: string) => {
  const v = vectors.find((x) => x.name === name);
  if (!v) throw new Error(`no vector ${name}`);
  return v;
};
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

describe("encoding matches Go", () => {
  it("writes an empty struct as the empty-object marker 0x80 (an account with inherited authorities)", () => {
    const v = vector("data-account-inherited-authority");
    expect(hex(encode(core.Account.fromObject(v.json)))).toBe(v.binary);
  });

  it("encodes a key page's transaction blacklist as Go's AllowedTransactions bitmask", () => {
    for (const name of ["key-page-blacklist", "key-page-blacklist-one-bit"]) {
      const v = vector(name);
      const page = core.Account.fromObject(v.json);
      expect(hex(encode(page))).toBe(v.binary);
      // The JSON form round-trips to Go's: the list of bit names.
      expect((page.asObject() as any).transactionBlacklist).toEqual(v.json.transactionBlacklist);
    }
  });

  it("re-encodes a real Directory self-anchor: a nested message and a zero time Go omits", () => {
    const v = vector("kermit-directory-self-anchor");
    const msg = messaging.Message.fromObject(v.json);
    expect((msg as any).message.constructor.name).toBe("TransactionMessage");
    const bin = encode(msg);
    expect(hex(bin)).toBe(v.binary);
    expect(createHash("sha256").update(bin).digest("hex")).toBe(v.hash);
  });
});

describe("lazily resolved types are real classes", () => {
  it("builds a nested anchor body, transaction result and signer as their classes, not plain objects", () => {
    const anchor = vector("kermit-directory-self-anchor").json.message.transaction.body;
    const blockAnchor = messaging.Message.fromObject({
      type: "blockAnchor",
      anchor: {
        type: "sequenced",
        message: {
          type: "transaction",
          transaction: { header: { principal: "acc://dn.acme/anchors" }, body: anchor },
        },
      },
    } as any) as any;
    expect(blockAnchor.anchor.constructor.name).toBe("SequencedMessage");
    expect(blockAnchor.anchor.message.constructor.name).toBe("TransactionMessage");
  });
});
