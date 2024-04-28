export * as promise from "./common/promise";
export { discoverDevices, registerTransportModule } from "./hw";
export type { Discovery, TransportModule } from "./hw";
export * from "./ledger-api";
export type {
  LedgerAddress,
  LedgerAppName,
  LedgerDeviceInfo,
  LedgerSignature,
  LedgerVersion,
} from "./model/results";
export type { Transport };
import type Transport from "@ledgerhq/hw-transport";
import { LedgerApi } from "./ledger-api";
export default LedgerApi;
