import TransportNodeHid, { getDevices } from "@ledgerhq/hw-transport-node-hid-noevents";
import { ED25519Key, Signer } from "../src";
import { SendTokens, Transaction, TransactionHeader } from "../src/core";
import { LedgerApi } from "../src/ledger";
import { Envelope } from "../src/messaging";

describe("ledger", () => {
  it("sign a transaction", async () => {
    // Find a Ledger
    const devices = getDevices();
    if (!devices?.length) return;
    const device = devices[0];

    // Open it
    const transport = await TransportNodeHid.open(device.path);
    if (!transport) throw new Error("failed to connect to wallet");

    // Initialize the signer
    const Ledger = new LedgerApi(transport);
    const signer = await Ledger.signerForPage("acc://lite-token-account.acme", "44'/281'/0'/0'/0'");

    // Build the Payload
    const recipient = await Signer.forLite(await ED25519Key.generate());
    const amount = 1000000000;
    const body = new SendTokens({ to: [{ url: recipient.url.join("ACME"), amount: amount }] });

    // Build the transaction header with the transaction principal and
    // optionally a timestamp, memo or metadata
    const header = new TransactionHeader({ principal: signer.url });

    // Finally build the (unsigned yet) transaction
    const tx = new Transaction({ body, header });

    // Sign with a key pair or manually sign with custom key store, Ledger, etc
    const sig = await signer.withVersion(1).sign(tx, { timestamp: Date.now() });
    const env = new Envelope({ transaction: [tx], signatures: [sig] });
    console.log(JSON.stringify(env.asObject()));
  });
});
