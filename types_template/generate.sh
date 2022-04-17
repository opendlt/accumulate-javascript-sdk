#!/bin/bash

set -eu

# Change directory to REPO/accumulate
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/../accumulate

# Enumerations
go run ./tools/cmd/gen-enum -l ../types_template/enums.ts.tmpl -o ../src/types/enums.ts \
    -i TransactionType,SignatureType \
    protocol/enums.yml

# Transactions
go run ./tools/cmd/gen-types -l ../types_template/types.ts.tmpl:protocol -o ../src/types/transactions.ts \
    -i Envelope,Transaction,TransactionHeader,LegacyED25519Signature,ED25519Signature,RCD1Signature \
    -i CreateIdentity,CreateTokenAccount,SendTokens,CreateDataAccount,WriteData,WriteDataTo,CreateToken,IssueTokens,BurnTokens,CreateKeyPage,CreateKeyBook,AddCredits,UpdateKeyPage,SignPending \
    -i KeySpecParams,TokenRecipient,DataEntry \
    protocol/transaction.yml protocol/general.yml

# # Accounts
# go run ./tools/cmd/gen-types -l ../types_template/types.ts.tmpl:protocol -o ../src/types/accounts.ts \
#     protocol/accounts.yml

# Change directory to REPO/, format everything
cd $SCRIPT_DIR
yarn format