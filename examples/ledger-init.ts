import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { retry } from "../src/ledger/common/promise";
import { registerTransportModule } from "../src/ledger/hw";

export function init() {
  console.log("Init!!");
  registerTransportModule({
    id: "hid",
    open: (devicePath) =>
      retry(() => TransportNodeHid.open(devicePath), {
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
}
