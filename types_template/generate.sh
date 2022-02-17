#!/bin/bash

# Change directory to REPO/accumulate
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/../accumulate

# Enumerations
go run ./tools/cmd/gen-enum -l ../types_template/enums.ts.tmpl -o ../src/types/enums.ts \
    protocol/enums.yml

# Transactions
go run ./tools/cmd/gen-types -l ../types_template/types.ts.tmpl:protocol -o ../src/types/transactions.ts \
    -i CreateIdentity,CreateTokenAccount,SendTokens,CreateDataAccount,WriteData,WriteDataTo,CreateToken,IssueTokens,BurnTokens,CreateKeyPage,CreateKeyBook,AddCredits,UpdateKeyPage,SignPending \
    -i KeySpecParams,TokenRecipient,DataEntry \
    protocol/transactions.yml protocol/general.yml

# # State types
# go run ./tools/cmd/gen-types -l ../types_template/types.ts.tmpl:state -o ../src/types/state.ts \
#     -i Object --rename Object:AccObject \
#     types/state/types.yml

# # Accounts
# go run ./tools/cmd/gen-types -l ../types_template/types.ts.tmpl:protocol -o ../src/types/accounts.ts \
#     protocol/accounts.yml

# Change directory to REPO/, format everything
cd $SCRIPT_DIR
yarn format