export * as promise from "./common/promise.js";
export { discoverDevices, registerTransportModule } from "./hw/index.js";
export type { Discovery, TransportModule } from "./hw/index.js";
export * from "./ledger-api.js";
export type {
  LedgerAddress,
  LedgerAppName,
  LedgerDeviceInfo,
  LedgerSignature,
  LedgerVersion,
} from "./model/results.js";
export type { Transport };
import type Transport from "@ledgerhq/hw-transport";
import { LedgerApi } from "./ledger-api.js";
export default LedgerApi;
