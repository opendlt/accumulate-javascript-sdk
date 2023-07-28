export type { Discovery, TransportModule } from "./hw";
export * from "./ledger-api";
export type {
  LedgerAddress,
  LedgerAppName,
  LedgerSignature,
  LedgerVersion,
  LedgerWalletInfo,
} from "./model/results";
import { LedgerApi } from "./ledger-api";
export default LedgerApi;
