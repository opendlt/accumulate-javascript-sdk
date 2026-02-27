/**
 * Shared types for the Accumulate helpers layer.
 * Aligned with TxResult / SubmitResult from Dart, Python, and Rust SDKs.
 */

/**
 * Structured result of a transaction submission.
 */
export interface TxResult {
  /** Whether the transaction was successfully delivered. */
  success: boolean;
  /** The transaction ID string (acc:// format). */
  txid: string;
  /** Error message, if the transaction failed. */
  error?: string;
  /** Raw response from the network. */
  rawResponse?: any;
  /** Simple hash of the transaction, hex-encoded. */
  simpleHash?: string;
}

/**
 * Information about a wallet (lite identity + lite token account).
 */
export interface Wallet {
  /** The Ed25519KeyPair associated with this wallet. */
  keypair: any; // Ed25519KeyPair — typed loosely to avoid circular deps
  /** The lite identity URL (acc://...). */
  liteIdentityUrl: string;
  /** The lite token account URL (acc://.../ACME). */
  liteTokenAccountUrl: string;
}

/**
 * Information about an ADI and its associated key book/page.
 */
export interface AdiInfo {
  /** The ADI URL (acc://my-adi.acme). */
  url: string;
  /** The key book URL (acc://my-adi.acme/book). */
  keyBookUrl: string;
  /** The key page URL (acc://my-adi.acme/book/1). */
  keyPageUrl: string;
  /** The keypair used to create this ADI. */
  keypair: any; // Ed25519KeyPair
}

/**
 * State of a key page, as returned by KeyManager.getKeyPageState().
 */
export interface KeyPageState {
  url: string;
  version: number;
  creditBalance: number;
  acceptThreshold: number;
  keys: KeyEntry[];
}

/**
 * A single key entry on a key page.
 */
export interface KeyEntry {
  keyHash: string;
  delegate?: string;
  lastUsedOn?: number;
}
