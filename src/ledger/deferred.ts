export default API;

export type {
  Discovery,
  TransportModule,
} from "./hw/index.js";
export type {
  LedgerAddress,
  LedgerAppName,
  LedgerDeviceInfo,
  LedgerSignature,
  LedgerVersion,
} from "./model/results.js";
export type {
  LedgerApi,
  LedgerKey,
} from "./ledger-api.js";
export type { default as Transport } from "@ledgerhq/hw-transport";

import type {
  Discovery,
  TransportModule,
} from "./hw/index.js";
import type {
  LedgerDeviceInfo,
} from "./model/results.js";
import type {
  LedgerApi,
  LedgerKey,
} from "./ledger-api.js";
import type Transport from "@ledgerhq/hw-transport";

export async function discoverDevices(
  accept: (mod: TransportModule) => boolean = () => true,
): Promise<Discovery> {
  const { discoverDevices } = await import("./index");
  return discoverDevices(accept);
}

export async function registerTransportModule(module: TransportModule) {
  const { registerTransportModule } = await import("./index");
  return registerTransportModule(module);
}

export async function API(transport: Transport): Promise<LedgerApi> {
  const { LedgerApi } = await import("./index");
  return new LedgerApi(transport);
}

export async function queryHidWallets(): Promise<Array<LedgerDeviceInfo>> {
  const { queryHidWallets } = await import("./index");
  return queryHidWallets();
}

export async function loadLedgerKey(api: LedgerApi, path: string): Promise<LedgerKey> {
  const { LedgerKey } = await import("./index");
  return LedgerKey.load(api, path);
}
