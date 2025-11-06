import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { api_v2, ED25519Key, Signer } from "accumulate.js";
import { SendTokens, Transaction, TransactionHeader } from "accumulate.js/core";
import {
  LedgerApi,
  promise,
  queryHidWallets,
  registerTransportModule,
} from "accumulate.js/ledger";
import { Envelope } from "accumulate.js/messaging";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

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
    })),
  ),
  disconnect: () => Promise.resolve(),
});

(async () => {
  // Find a Ledger
  const [wallet, ...rest] = await queryHidWallets();
  if (!wallet) throw new Error("no connected wallet");
  if (rest.length) throw new Error("multiple connected wallets");

  // Open it
  const transport = await wallet.transportModule.open(wallet.transportModule.id);
  if (!transport) throw new Error("failed to connect to wallet");

  // Initialize the signer
  const Ledger = new LedgerApi(transport);
  const signer = await Ledger.signerForPage("acc://lite-token-account/acme", "44'/281'/0'/0'/0'");

  // Build the Payload
  const recipient = Signer.forLite(ED25519Key.generate());
  const amount = 10;
  const body = new SendTokens({ to: [{ url: recipient.url.join("ACME"), amount: amount }] });

  // Build the transaction header with the transaction principal and optionally
  // a timestamp, memo or metadata
  const header = new TransactionHeader({ principal: signer.url });

  // Finally build the (unsigned yet) transaction
  const tx = new Transaction({ body, header });

  // Sign with a key pair or manually sign with custom key store, Ledger, etc
  const sig = await signer.withVersion(1).sign(tx, { timestamp: Date.now() });
  const env = new Envelope({ transaction: [tx], signatures: [sig] });

  // Submit the envelope
  const client = new api_v2.Client("https://mainnet.accumulatenetwork.io/v2");
  const res = await client.execute(env);
  await client.waitOnTx(res.txid.toString());
})();
