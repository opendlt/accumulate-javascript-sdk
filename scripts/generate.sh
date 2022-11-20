#!/bin/bash

set -eu

# Change directory to REPO/accumulate
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/../accumulate

go run ./tools/cmd/gen-enum -l typescript -o ../new/errors/enums_gen.ts pkg/errors/status.yml
go run ./tools/cmd/gen-types -l typescript -o ../new/errors/types_gen.ts pkg/errors/error.yml --header='
import { Status } from ".";
'

go run ./tools/cmd/gen-enum -l typescript -o ../new/managed/enums_gen.ts internal/database/smt/managed/enums.yml
go run ./tools/cmd/gen-types -l typescript -o ../new/managed/types_gen.ts internal/database/smt/managed/types.yml --header='
import { ChainType, MerkleState } from ".";
'

go run ./tools/cmd/gen-enum -l typescript -o ../new/core/enums_gen.ts protocol/enums.yml
go run ./tools/cmd/gen-types -l typescript -o ../new/core/types_gen.ts \
    protocol/{accounts,account_auth_operations,general,key_page_operations,signatures,synthetic_transactions,system,transaction,transaction_results,user_transactions}.yml \
    -x Object,AnchorMetadata,ChainMetadata \
    --header='
import * as url from "../url";
import * as errors2 from "../errors";
import * as managed from "../managed";
import { AccountAuthOperationType, AccountType, AllowedTransactions, AnchorBody, BookType, DataEntryType, Fee, KeyPageOperationType, PartitionType, SignatureType, Signer, TransactionResult, TransactionType, VoteType } from ".";
'

# Change directory to REPO/, format everything
cd $SCRIPT_DIR/..
yarn prettier --config .prettierrc --write new/**/*.ts