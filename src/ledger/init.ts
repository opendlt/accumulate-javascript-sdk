import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { retry } from "./common/promise";
import { registerTransportModule } from "./hw";

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

if (!process.env.CI) {
  init();
}
