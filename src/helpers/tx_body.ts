/**
 * TxBody — Static factory for building Accumulate transaction bodies.
 *
 * Eliminates the need to manually construct TransactionBody objects.
 * Each method returns a protocol-level body object ready for SmartSigner.
 *
 * Aligned with:
 *   - Rust:   TxBody::add_credits(), TxBody::send_tokens_single(), ...
 *   - Python: TxBody.add_credits(), TxBody.send_tokens_single(), ...
 *   - Dart:   TxBody.addCredits(), TxBody.sendTokensSingle(), ...
 */

import { Buffer } from "../common/index.js";
import {
  DoubleHashDataEntry,
  AddCredits,
  BurnCredits,
  BurnTokens,
  CreateDataAccount,
  CreateIdentity,
  CreateKeyBook,
  CreateKeyPage,
  CreateToken,
  CreateTokenAccount,
  IssueTokens,
  KeySpecParams,
  LockAccount,
  SendTokens,
  TokenRecipient,
  TransferCredits,
  CreditRecipient,
  UpdateAccountAuth,
  UpdateKey,
  UpdateKeyPage,
  AddKeyOperation,
  RemoveKeyOperation,
  SetThresholdKeyPageOperation,
  WriteData,
  WriteDataTo,
} from "../core/index.js";

/**
 * Helper to ensure a value is a Uint8Array.
 * Accepts hex strings or Uint8Array.
 */
function toBytes(v: Uint8Array | string): Uint8Array {
  if (v instanceof Uint8Array) return v;
  return Buffer.from(v, "hex");
}

export class TxBody {
  // ── Credits ─────────────────────────────────────────────────────────────

  /**
   * Add credits to a recipient account.
   * @param recipient  The recipient URL (usually a lite identity or key page).
   * @param amount  The ACME amount (in smallest unit) to spend purchasing credits.
   * @param oracle  The oracle price from networkStatus or getOraclePrice().
   */
  static addCredits(
    recipient: string,
    amount: bigint | string | number,
    oracle: number,
  ): AddCredits {
    return new AddCredits({ recipient, amount, oracle });
  }

  /**
   * Transfer credits between credit accounts.
   * @param toUrl  Destination credit account URL.
   * @param amount  Number of credits to transfer.
   */
  static transferCredits(toUrl: string, amount: number): TransferCredits {
    return new TransferCredits({
      to: [new CreditRecipient({ url: toUrl, amount })],
    });
  }

  // ── Identity & ADI ──────────────────────────────────────────────────────

  /**
   * Create a new ADI (Accumulate Digital Identity).
   * @param url  The ADI URL (e.g. "acc://my-adi.acme").
   * @param keyBookUrl  The key book URL (e.g. "acc://my-adi.acme/book").
   * @param publicKeyHash  SHA256 of the initial key's public key.
   */
  static createIdentity(
    url: string,
    keyBookUrl: string,
    publicKeyHash: Uint8Array | string,
  ): CreateIdentity {
    return new CreateIdentity({
      url,
      keyBookUrl,
      keyHash: toBytes(publicKeyHash),
    });
  }

  // ── Token Accounts ──────────────────────────────────────────────────────

  /**
   * Create a token account under an ADI.
   * @param url  The token account URL (e.g. "acc://my-adi.acme/tokens").
   * @param tokenUrl  The token type URL (default "acc://ACME").
   * @param authorities  Optional authority URLs.
   */
  static createTokenAccount(
    url: string,
    tokenUrl = "acc://ACME",
    authorities?: string[],
  ): CreateTokenAccount {
    return new CreateTokenAccount({ url, tokenUrl, authorities });
  }

  // ── Data Accounts ───────────────────────────────────────────────────────

  /**
   * Create a data account under an ADI.
   * @param url  The data account URL (e.g. "acc://my-adi.acme/data").
   * @param authorities  Optional authority URLs.
   */
  static createDataAccount(
    url: string,
    authorities?: string[],
  ): CreateDataAccount {
    return new CreateDataAccount({ url, authorities });
  }

  // ── Token Transfers ─────────────────────────────────────────────────────

  /**
   * Send tokens to a single recipient.
   * @param toUrl  The destination token account URL.
   * @param amount  Amount in the smallest unit (e.g. 100000000 = 1 ACME).
   */
  static sendTokensSingle(
    toUrl: string,
    amount: bigint | string | number,
  ): SendTokens {
    return new SendTokens({
      to: [new TokenRecipient({ url: toUrl, amount })],
    });
  }

  /**
   * Send tokens to multiple recipients.
   * @param recipients  Array of {url, amount} pairs.
   */
  static sendTokensMulti(
    recipients: Array<{ url: string; amount: bigint | string | number }>,
  ): SendTokens {
    return new SendTokens({
      to: recipients.map((r) => new TokenRecipient({ url: r.url, amount: r.amount })),
    });
  }

  // ── Data Entries ────────────────────────────────────────────────────────

  /**
   * Write data entries (plain text strings, auto-converted to UTF-8 bytes).
   * @param entries  Array of string data entries.
   */
  static writeData(entries: string[]): WriteData {
    return new WriteData({
      entry: new DoubleHashDataEntry({
        data: entries.map((e) => Buffer.from(e, "utf-8")),
      }),
    });
  }

  /**
   * Write data entries from hex-encoded strings.
   * @param entriesHex  Array of hex-encoded data entries.
   */
  static writeDataHex(entriesHex: string[]): WriteData {
    return new WriteData({
      entry: new DoubleHashDataEntry({
        data: entriesHex.map((e) => Buffer.from(e, "hex")),
      }),
    });
  }

  /**
   * Write raw byte data entries.
   * @param entries  Array of Uint8Array data entries.
   */
  static writeDataRaw(entries: Uint8Array[]): WriteData {
    return new WriteData({
      entry: new DoubleHashDataEntry({ data: entries }),
    });
  }

  // ── Custom Tokens ───────────────────────────────────────────────────────

  /**
   * Create a custom token issuer.
   * @param url  The token issuer URL (e.g. "acc://my-adi.acme/my-token").
   * @param symbol  Token symbol (e.g. "MYTKN").
   * @param precision  Decimal precision (e.g. 8).
   * @param supplyLimit  Optional maximum supply.
   */
  static createToken(
    url: string,
    symbol: string,
    precision: number,
    supplyLimit?: bigint | string | number,
  ): CreateToken {
    return new CreateToken({ url, symbol, precision, supplyLimit });
  }

  /**
   * Issue tokens from a token issuer to a recipient.
   * @param recipientUrl  Destination token account URL.
   * @param amount  Amount to issue.
   */
  static issueTokens(
    recipientUrl: string,
    amount: bigint | string | number,
  ): IssueTokens {
    return new IssueTokens({
      to: [new TokenRecipient({ url: recipientUrl, amount })],
    });
  }

  /**
   * Burn tokens from the principal account.
   * @param amount  Amount to burn.
   */
  static burnTokens(amount: bigint | string | number): BurnTokens {
    return new BurnTokens({ amount });
  }

  // ── Key Management ──────────────────────────────────────────────────────

  /**
   * Add a key to a key page.
   * @param keyHash  SHA256 hash of the new key's public key.
   */
  static updateKeyPageAddKey(
    keyHash: Uint8Array | string,
  ): UpdateKeyPage {
    return new UpdateKeyPage({
      operation: [
        new AddKeyOperation({
          entry: new KeySpecParams({ keyHash: toBytes(keyHash) }),
        }),
      ],
    });
  }

  /**
   * Remove a key from a key page.
   * @param keyHash  SHA256 hash of the key to remove.
   */
  static updateKeyPageRemoveKey(
    keyHash: Uint8Array | string,
  ): UpdateKeyPage {
    return new UpdateKeyPage({
      operation: [
        new RemoveKeyOperation({
          entry: new KeySpecParams({ keyHash: toBytes(keyHash) }),
        }),
      ],
    });
  }

  /**
   * Set the acceptance threshold on a key page.
   * @param threshold  New threshold value (e.g. 2 for 2-of-N).
   */
  static updateKeyPageSetThreshold(threshold: number): UpdateKeyPage {
    return new UpdateKeyPage({
      operation: [
        new SetThresholdKeyPageOperation({ threshold }),
      ],
    });
  }

  /**
   * Create a new key page with the given keys.
   * @param keyHashes  Array of SHA256 hashes of the initial keys.
   */
  static createKeyPage(
    keyHashes: Array<Uint8Array | string>,
  ): CreateKeyPage {
    return new CreateKeyPage({
      keys: keyHashes.map((kh) => new KeySpecParams({ keyHash: toBytes(kh) })),
    });
  }

  /**
   * Create a new key book under an ADI.
   * @param url  The key book URL (e.g. "acc://my-adi.acme/book").
   * @param publicKeyHash  SHA256 hash of the initial signing key.
   */
  static createKeyBook(
    url: string,
    publicKeyHash: Uint8Array | string,
  ): CreateKeyBook {
    return new CreateKeyBook({
      url,
      publicKeyHash: toBytes(publicKeyHash),
    });
  }

  // ── Additional operations ───────────────────────────────────────────────

  /**
   * Burn credits from a credit account.
   * @param amount  Number of credits to burn.
   */
  static burnCredits(amount: number): BurnCredits {
    return new BurnCredits({ amount });
  }

  /**
   * Write data to a remote data account.
   * @param recipient  The destination data account URL.
   * @param entries  Array of string data entries (auto-converted to UTF-8 bytes).
   */
  static writeDataTo(recipient: string, entries: string[]): WriteDataTo {
    return new WriteDataTo({
      recipient,
      entry: new DoubleHashDataEntry({
        data: entries.map((e) => Buffer.from(e, "utf-8")),
      }),
    });
  }

  /**
   * Update a key on a key page (key rotation).
   * @param newKeyHash  SHA256 hash of the new key's public key.
   */
  static updateKey(newKeyHash: Uint8Array | string): UpdateKey {
    return new UpdateKey({ newKeyHash: toBytes(newKeyHash) });
  }

  /**
   * Lock an account at a specific directory height.
   * @param height  The directory block height at which to lock.
   */
  static lockAccount(height: number): LockAccount {
    return new LockAccount({ height });
  }

  /**
   * Update account authorities (add/remove/enable/disable).
   * @param operations  Array of authority operation objects.
   */
  static updateAccountAuth(operations: unknown[]): UpdateAccountAuth {
    return new UpdateAccountAuth({ operations });
  }

  /**
   * Generic UpdateKeyPage with raw operations array.
   * For simple cases, prefer updateKeyPageAddKey, updateKeyPageRemoveKey, or updateKeyPageSetThreshold.
   * @param operations  Array of key page operation objects.
   */
  static updateKeyPage(operations: unknown[]): UpdateKeyPage {
    return new UpdateKeyPage({ operation: operations });
  }
}
