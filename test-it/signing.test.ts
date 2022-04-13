import { Client, LiteAccount, RCD1KeypairSigner, SignatureType } from "../src";
import { addCredits, waitOn } from "./util";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");

describe("Test signing schemes", () => {
  test("should sign transaction using RCD1 hash", async () => {
    const rcd1Account = new LiteAccount(RCD1KeypairSigner.generate());

    expect(rcd1Account.info.type).toStrictEqual(SignatureType.SignatureTypeRCD1);

    // Get some ACME
    await client.faucet(rcd1Account.url);
    await waitOn(async () => {
      const { data } = await client.queryUrl(rcd1Account.url);
      expect(data.type).toStrictEqual("liteTokenAccount");
    });

    // Get some credits
    await addCredits(client, rcd1Account.url, 10_000, rcd1Account);
  });
});
