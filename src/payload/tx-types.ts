export enum TxType {
  // TxTypeCreateIdentity creates an ADI, which produces a synthetic chain
  // create transaction.
  CreateIdentity = 0x01,

  // TxTypeCreateTokenAccount creates an ADI token account, which produces a
  // synthetic chain create transaction.
  CreateTokenAccount = 0x02,

  // TxTypeSendTokens transfers tokens between token accounts, which produces
  // a synthetic deposit tokens transaction.
  SendTokens = 0x03,

  // TxTypeCreateDataAccount creates an ADI Data Account, which produces a
  // synthetic chain create transaction.
  CreateDataAccount = 0x04,

  // TxTypeWriteData writes data to an ADI Data Account, which *does not*
  // produce a synthetic transaction.
  WriteData = 0x05,

  // TxTypeWriteDataTo writes data to a Lite Data Account, which produces a
  // synthetic write data transaction.
  WriteDataTo = 0x06,

  // TxTypeAcmeFaucet produces a synthetic deposit tokens transaction that
  // deposits ACME tokens into a lite account.
  AcmeFaucet = 0x07,

  // TxTypeCreateToken creates a token issuer, which produces a synthetic
  // chain create transaction.
  CreateToken = 0x08,

  // TxTypeIssueTokens issues tokens to a token account, which produces a
  // synthetic token deposit transaction.
  IssueTokens = 0x09,

  // TxTypeBurnTokens burns tokens from a token account, which produces a
  // synthetic burn tokens transaction.
  BurnTokens = 0x0a,

  // TxTypeCreateKeyPage creates a key page, which produces a synthetic chain
  // create transaction.
  CreateKeyPage = 0x0c,

  // TxTypeCreateKeyBook creates a key book, which produces a synthetic chain
  // create transaction.
  CreateKeyBook = 0x0d,

  // TxTypeAddCredits converts ACME tokens to credits, which produces a
  // synthetic deposit credits transaction.
  AddCredits = 0x0e,

  // TxTypeUpdateKeyPage adds, removes, or updates keys in a key page, which
  // *does not* produce a synthetic transaction.
  UpdateKeyPage = 0x0f,
}
