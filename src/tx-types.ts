export enum TransactionType {
  /** CreateIdentity creates an ADI, which produces a synthetic chain. */
  CreateIdentity = 1,
  /** CreateTokenAccount creates an ADI token account, which produces a synthetic chain create transaction. */
  CreateTokenAccount = 2,
  /** SendTokens transfers tokens between token accounts, which produces a synthetic deposit tokens transaction. */
  SendTokens = 3,
  /** CreateDataAccount creates an ADI Data Account, which produces a synthetic chain create transaction. */
  CreateDataAccount = 4,
  /** WriteData writes data to an ADI Data Account, which *does not* produce a synthetic transaction. */
  WriteData = 5,
  /** WriteDataTo writes data to a Lite Data Account, which produces a synthetic write data transaction. */
  WriteDataTo = 6,
  /** AcmeFaucet produces a synthetic deposit tokens transaction that deposits ACME tokens into a lite token account. */
  AcmeFaucet = 7,
  /** CreateToken creates a token issuer, which produces a synthetic chain create transaction. */
  CreateToken = 8,
  /** IssueTokens issues tokens to a token account, which produces a synthetic token deposit transaction. */
  IssueTokens = 9,
  /** BurnTokens burns tokens from a token account, which produces a synthetic burn tokens transaction. */
  BurnTokens = 10,
  /** CreateKeyPage creates a key page, which produces a synthetic chain create transaction. */
  CreateKeyPage = 12,
  /** CreateKeyBook creates a key book, which produces a synthetic chain create transaction. */
  CreateKeyBook = 13,
  /** AddCredits converts ACME tokens to credits, which produces a synthetic deposit credits transaction. */
  AddCredits = 14,
  /** UpdateKeyPage adds, removes, or updates keys in a key page, which *does not* produce a synthetic transaction. */
  UpdateKeyPage = 15,
  /** AddValidator add a validator. */
  AddValidator = 18,
  /** RemoveValidator remove a validator. */
  RemoveValidator = 19,
  /** UpdateValidatorKey update a validator key. */
  UpdateValidatorKey = 20,
  /** UpdateAccountAuth updates authorization for an account. */
  UpdateAccountAuth = 21,
  /** UpdateKey update key for existing keys. */
  UpdateKey = 22,
}
