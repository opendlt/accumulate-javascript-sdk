import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ED25519Key, Signer } from "../lib";
import { SendTokens, Transaction, TransactionHeader } from "../lib/core";
import { LedgerApi, promise, queryHidWallets, registerTransportModule } from "../lib/ledger";
import { Envelope } from "../lib/messaging";

// Initialize Ledger transport
registerTransportModule({
  id: "hid",
  open: (devicePath) =>
    promise.retry(() => TransportNodeHid.open(devicePath), {
      context: "open-hid",
    }),
  discovery: new Observable(TransportNodeHid.listen).pipe(
    map((e: any) => ({
      type: e.type,
      id: e.device.path,
      name: e.device.deviceName || "",
    }))
  ),
  disconnect: () => Promise.resolve(),
});

describe("ledger", () => {
  it('query HID wallets', async () => {
    const wallets = await queryHidWallets();
    if (!wallets) return;

    console.log(wallets)

    const wallet = wallets[0]

    const transport = await wallet.transportModule.open(wallet.deviceId);
    if (!transport) throw new Error("failed to connect to wallet");

    const Ledger = new LedgerApi(transport);
    const signer = await Ledger.signerForPage("acc://lite-token-account.acme", "44'/281'/0'/0'/0'");

    // Build the Payload
    const recipient = await Signer.forLite(await ED25519Key.generate());
    const amount = 1000000000;
    const body = new SendTokens({ to: [{ url: recipient.url.join("ACME"), amount: amount }] });
    // Build the transaction header with the transaction principal
    // and optionally a timestamp, memo or metadata.
    const header = new TransactionHeader({ principal: signer.url });

    // Finally build the (unsigned yet) transaction
    const tx = new Transaction({ body, header });

    // Sign with a key pair or manually sign with custom key store, Ledger, etc
    const sig = await signer.withVersion(1).sign(tx, { timestamp: Date.now() });
    const env = new Envelope({ transaction: [tx], signatures: [sig] });
    console.log(env);
  });
});
