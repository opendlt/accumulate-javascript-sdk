export default API;

export type {
  Discovery,
  LedgerAddress,
  LedgerApi,
  LedgerAppName,
  LedgerDeviceInfo,
  LedgerKey,
  LedgerSignature,
  LedgerVersion,
  Transport,
  TransportModule,
} from "./index";

import type {
  Discovery,
  LedgerApi,
  LedgerDeviceInfo,
  LedgerKey,
  Transport,
  TransportModule,
} from "./index";

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
