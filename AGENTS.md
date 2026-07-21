# Building on Accumulate with the JavaScript / TypeScript SDK

You are integrating the Accumulate blockchain using the JavaScript / TypeScript SDK (`accumulate-sdk-opendlt`). Follow this guide.

## Golden path (use this, not the low-level API)
```
const client = Accumulate.forKermit();   // or forMainnet()/forDevnet()
// 1. build the transaction body
// body = TxBody.<operation>(...)   // see Operations below
// 2. sign, submit, and wait for delivery
const r = await new SmartSigner(signer).signSubmitAndWait(principal, body);
// 3. query the account to confirm the effect
```

## Rules
- **Amounts:** 1 ACME = 1e8 base units. Never pass whole ACME as-is.
- **Testnet first:** target Kermit and fund lite accounts via the faucet before spending.
- **Prerequisites matter:** create an ADI, then buy credits for its key page before it can sign; wait for balances/credits to settle before the next step.
- **Errors are typed:** branch on the SDK error type/code; retry only on network errors, not validation errors.
- **Entry point:** start from `Accumulate` — do not hand-roll envelopes or signing.

## Operations available
- **utility:** `generate_keys`, `faucet`, `wait_for_balance`, `wait_for_credits`
- **credits:** `add_credits`, `transfer_credits`, `burn_credits`
- **identity:** `create_identity`, `create_key_book`, `create_key_page`
- **account:** `create_token_account`, `create_data_account`, `create_token`, `create_lite_token_account`
- **transaction:** `send_tokens`, `issue_tokens`, `burn_tokens`, `write_data`, `write_data_to`
- **query:** `query_account`
- **authority:** `update_key_page`, `update_key`, `lock_account`, `update_account_auth`

## More
- Complete API with signatures, inputs, outputs, and errors: `llms-full.txt`.
- Runnable end-to-end examples: `examples/v3/`.
