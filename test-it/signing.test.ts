import { Client, LiteIdentity, RCD1KeypairSigner, SignatureType } from "../src";
import { addCredits } from "./util";

const client = new Client(process.env.ACC_ENDPOINT || "http://127.0.1.1:26660/v2");

describe("Test signing schemes", () => {
  test("should sign transaction using RCD1 hash", async () => {
    const rcd1Account = new LiteIdentity(RCD1KeypairSigner.generate());

    expect(rcd1Account.info.type).toStrictEqual(SignatureType.SignatureTypeRCD1);

    // Get some ACME
    const res = await client.faucet(rcd1Account.acmeTokenAccount);
    await client.waitOnTx(res.txid);
    const { data } = await client.queryUrl(rcd1Account.acmeTokenAccount);
    expect(data.type).toStrictEqual("liteTokenAccount");

    // Get some credits
    await addCredits(client, rcd1Account.url, 10_000, rcd1Account);
  });
});
