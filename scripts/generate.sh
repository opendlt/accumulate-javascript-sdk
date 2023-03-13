#!/bin/bash

set -eu

# Change directory to REPO/accumulate
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/../accumulate

go run ./tools/cmd/gen-enum -l typescript -o ../new/errors/enums_gen.ts pkg/errors/status.yml
go run ./tools/cmd/gen-types -l typescript -o ../new/errors/types_gen.ts pkg/errors/error.yml --header='
import { Status } from ".";
'

go run ./tools/cmd/gen-enum -l typescript -o ../new/merkle/enums_gen.ts pkg/types/merkle/enums.yml
go run ./tools/cmd/gen-types -l typescript -o ../new/merkle/types_gen.ts pkg/types/merkle/types.yml --header='
import { ChainType } from ".";
'

go run ./tools/cmd/gen-enum -l typescript -o ../new/core/enums_gen.ts protocol/enums.yml
go run ./tools/cmd/gen-types -l typescript-union -o ../new/core/unions_gen.ts \
    protocol/{accounts,account_auth_operations,general,key_page_operations,signatures,synthetic_transactions,system,transaction,transaction_results,user_transactions}.yml

go run ./tools/cmd/gen-types -l typescript -o ../new/core/types_gen.ts \
    protocol/{accounts,account_auth_operations,general,key_page_operations,signatures,synthetic_transactions,system,transaction,transaction_results,user_transactions}.yml \
    -x Object,AnnotatedReceipt,AnchorMetadata,ChainMetadata \
    --header='
import * as errors2 from "../errors";
import * as merkle from "../merkle";
import { URL, TxID } from "../url";
import { TransactionBase } from "./base";
import {
  Account,
  AccountAuthOperation,
  AccountAuthOperationType,
  AccountType,
  AllowedTransactions,
  AnchorBody,
  BookType,
  DataEntry,
  DataEntryType,
  ExecutorVersion,
  Fee,
  KeyPageOperation,
  KeyPageOperationType,
  PartitionType,
  Signature,
  SignatureType,
  Signer,
  TransactionBody,
  TransactionResult,
  TransactionType,
  VoteType,
} from ".";
'

# Change directory to REPO/, format everything
cd $SCRIPT_DIR/..
yarn prettier --config .prettierrc --write new{,/**}/*.ts