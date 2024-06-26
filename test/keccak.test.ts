/* eslint-disable no-useless-escape */

import { Buffer } from "../src/common/buffer";
import { keccak256 } from "../src/common/keccak";

describe("keccak-256", () => {
  it.each([
    ["c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470", ""],
    ["3ac225168df54212a25c1c01fd35bebfea408fdac2e31ddd6f80a4bbf9a5f1cb", "a"],
    ["67fad3bfa1e0321bd021ca805ce14876e50acac8ca8532eda8cbf924da565160", "ab"],
  ])("hashes", (want, data) => {
    const got = Buffer.from(keccak256(Buffer.from(data) || new Uint8Array())).toString("hex");
    expect(got).toEqual(want);
  });
});
