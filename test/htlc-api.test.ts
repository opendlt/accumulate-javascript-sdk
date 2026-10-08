/* eslint-disable @typescript-eslint/no-explicit-any */
// API-level tests for the 1.4.6.x additions: header options through SmartSigner, hash locks,
// releaseLockedOperation, Receipt, NetworkGlobals.blockInterval and the proof-service methods.
// Byte expectations come from vectors produced by Go's own marshaler (test/data/golden-vectors.json).
import * as fs from "fs";
import * as path from "path";
import * as api_v3 from "../src/api_v3";
import { JsonRpcClient } from "../src/api_v3/client";
import { Buffer } from "../src/common/buffer";
import * as core from "../src/core";
import { encode } from "../src/encoding";
import { Duration } from "../src/encoding/encodable";
import { validateHashLockForSubmit } from "../src/helpers/hash_lock";
import { buildTransactionHeader } from "../src/helpers/smart_signer";
import { TxBody } from "../src/helpers/tx_body";
import { Envelope } from "../src/messaging";

const vectors: any[] = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data", "golden-vectors.json"), "utf8"),
);
const vec = (name: string) => vectors.find((v) => v.name === name)!;
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

const INITIATOR = vec("header_plain").json.initiator as string;
const LOCK_HASH = Buffer.from(Array.from({ length: 32 }, (_, i) => i + 1));

describe("SmartSigner header options (fields 5-8)", () => {
  it("no options leaves the header bytes exactly as before", () => {
    const h = new core.TransactionHeader({
      ...buildTransactionHeader("acc://alice.acme/tokens"),
      initiator: INITIATOR,
    });
    expect(hex(encode(h))).toBe(vec("header_plain").binaryHex);
  });

  it("every option reaches the header and matches Go's bytes", () => {
    const opts = {
      memo: "all",
      metadata: Buffer.from([9]),
      expire: new Date("2031-05-06T07:08:09Z"),
      holdUntil: 5,
      authorities: ["acc://auth1.acme/book"],
      hashLock: TxBody.hashLock(
        core.HashAlgorithm.SHA256,
        LOCK_HASH,
        new Date("2030-01-02T03:04:05Z"),
      ),
    };
    const h = new core.TransactionHeader({
      ...buildTransactionHeader("acc://alice.acme/tokens", opts),
      initiator: INITIATOR,
    });
    expect(hex(encode(h))).toBe(vec("header_all_fields").binaryHex);
  });

  it("the signed hash survives a JSON hand-off to a co-signer", () => {
    const body = new core.Transaction(vec("tx_sendtokens_hashlock").json).body;
    const txn = new core.Transaction({
      header: {
        ...buildTransactionHeader("acc://alice.acme/tokens", {
          expire: { atTime: new Date("2031-05-06T07:08:09Z") },
          holdUntil: { minorBlock: 5 },
          authorities: ["acc://auth1.acme/book"],
          hashLock: TxBody.hashLock(
            core.HashAlgorithm.SHA256D,
            LOCK_HASH,
            new Date("2030-01-02T03:04:05Z"),
          ),
        }),
        initiator: INITIATOR,
      },
      body,
    });
    const envelope = new Envelope({ transaction: [txn], signatures: [] });
    const wire = JSON.parse(JSON.stringify(envelope.asObject()));
    const received = new Envelope(wire).transaction![0]!;
    expect(hex(received.hash())).toBe(hex(txn.hash()));
    expect(received.header!.hashLock?.hashAlgorithm).toBe(core.HashAlgorithm.SHA256D);
    expect(received.header!.authorities).toHaveLength(1);
  });
});

describe("hash lock helpers", () => {
  it("the hash-locked SendTokens hashes to Go's value", () => {
    const v = vec("tx_sendtokens_hashlock");
    const txn = new core.Transaction({
      header: {
        ...buildTransactionHeader("acc://alice.acme/tokens", {
          hashLock: TxBody.hashLock(
            core.HashAlgorithm.SHA256,
            LOCK_HASH,
            new Date("2030-01-02T03:04:05Z"),
          ),
        }),
        initiator: INITIATOR,
      },
      body: new core.Transaction(v.json).body,
    });
    expect(hex(txn.hash())).toBe(v.hashHex);
  });

  it("releaseLockedOperation hashes to Go's value", () => {
    const v = vec("tx_releaselockedoperation");
    const txn = new core.Transaction({
      header: { ...buildTransactionHeader("acc://alice.acme/tokens"), initiator: INITIATOR },
      body: TxBody.releaseLockedOperation(v.json.body.lockedTxID, Buffer.from("secret preimage")),
    });
    expect(hex(txn.hash())).toBe(v.hashHex);
    // a hex string is accepted too
    const again = TxBody.releaseLockedOperation(
      v.json.body.lockedTxID,
      Buffer.from("secret preimage").toString("hex"),
    );
    expect(hex(again.preimage!)).toBe(hex(Buffer.from("secret preimage")));
  });

  describe("validateHashLockForSubmit mirrors the node", () => {
    const now = new Date("2030-01-01T00:00:00Z");
    const lock = (alg: core.HashAlgorithm, len: number, aheadMs: number | null) => ({
      hashAlgorithm: alg,
      hash: new Uint8Array(len),
      expiration: aheadMs === null ? undefined : new Date(now.getTime() + aheadMs),
    });
    const MIN = 60_000;
    const DAY = 86_400_000;

    it("accepts valid locks", () => {
      validateHashLockForSubmit(lock(core.HashAlgorithm.SHA256, 32, 60 * MIN), now);
      validateHashLockForSubmit(lock(core.HashAlgorithm.SHA256D, 32, 30 * DAY), now);
      validateHashLockForSubmit(lock(core.HashAlgorithm.HASH160, 20, 10 * MIN), now);
    });

    it.each([
      ["wrong length for SHA256", lock(core.HashAlgorithm.SHA256, 20, 60 * MIN)],
      ["wrong length for HASH160", lock(core.HashAlgorithm.HASH160, 32, 60 * MIN)],
      ["unknown algorithm", lock(core.HashAlgorithm.Unknown, 32, 60 * MIN)],
      ["missing expiration", lock(core.HashAlgorithm.SHA256, 32, null)],
      ["expires too soon", lock(core.HashAlgorithm.SHA256, 32, 9 * MIN)],
      ["expires too late", lock(core.HashAlgorithm.SHA256, 32, 31 * DAY)],
    ])("rejects %s", (_name, l) => {
      expect(() => validateHashLockForSubmit(l, now)).toThrow();
    });
  });
});

describe("v3 Receipt", () => {
  it("round-trips the new fields", () => {
    const r = new api_v3.Receipt({
      start: "ab",
      end: "cd",
      anchor: "ef",
      localBlock: 12,
      majorBlock: 3,
      forHeight: 9,
      complete: false,
      partition: "bvn0",
      startsAtMainState: true,
    });
    expect(r.forHeight).toBe(9);
    expect(r.partition).toBe("bvn0");
    expect(r.startsAtMainState).toBe(true);
    const again = new api_v3.Receipt(JSON.parse(JSON.stringify(r.asObject())));
    expect(hex(encode(again))).toBe(hex(encode(r)));
  });

  it("an old response without them still parses and encodes as before", () => {
    const old = new api_v3.Receipt({ start: "ab", localBlock: 12, majorBlock: 3 });
    expect(old.forHeight).toBeUndefined();
    expect(old.startsAtMainState).toBeUndefined();
    expect(hex(encode(old))).toBe(hex(encode(new api_v3.Receipt(old.asObject()))));
  });
});

describe("NetworkGlobals.blockInterval", () => {
  it.each([
    ["object", { seconds: 1, nanoseconds: 500000000 }, 1.5],
    ["number of seconds", 2, 2],
    ["Go duration string", "1m30s", 90],
    ["Go duration with ms", "250ms", 0.25],
  ])("accepts %s", (_n, input, seconds) => {
    expect(new core.NetworkGlobals({ blockInterval: input as any }).blockInterval).toBeCloseTo(
      seconds as number,
    );
  });

  it("is optional, so older network status parses", () => {
    expect(new core.NetworkGlobals({ majorBlockSchedule: "0 */12 * * *" }).blockInterval).toBe(
      undefined,
    );
  });

  it("rejects a malformed duration string", () => {
    expect(() => Duration.toSeconds("soon")).toThrow();
    expect(() => Duration.toSeconds("5 parsecs")).toThrow();
  });
});

describe("proof service methods", () => {
  const client = () => {
    const c = new JsonRpcClient("http://localhost/v3");
    const calls: any[] = [];
    (c as any).call = async (method: string, params: any) => {
      calls.push({ method, params });
      return [];
    };
    return { c, calls };
  };

  it("majorHeaderRange / minorRootRange send the options as Go expects", async () => {
    const { c, calls } = client();
    await c.majorHeaderRange({ partition: "Directory", start: 1, end: 4 });
    await c.minorRootRange({ partition: "Directory", since: 10 });
    expect(calls).toEqual([
      { method: "major-header-range", params: { partition: "Directory", start: 1, end: 4 } },
      { method: "minor-root-range", params: { partition: "Directory", since: 10, until: 0 } },
    ]);
  });

  it("anchorReceipt sends a lowercase hex root and validates its length", async () => {
    const { c, calls } = client();
    await c.anchorReceipt({ partition: "bvn0", bptRoot: "AB".repeat(32), atOrAfter: 3 });
    await c.anchorReceipt({ partition: "bvn0", bptRoot: new Uint8Array(32).fill(1) });
    expect(calls[0]).toEqual({
      method: "anchor-receipt",
      params: { partition: "bvn0", bptRoot: "ab".repeat(32), atOrAfter: 3 },
    });
    expect(calls[1].params.bptRoot).toBe("01".repeat(32));
    expect(calls[1].params.atOrAfter).toBeUndefined();
    expect(() => c.anchorReceipt({ partition: "bvn0", bptRoot: "abcd" })).toThrow();
  });
});
