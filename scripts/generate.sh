#!/bin/bash

set -eu

# Change directory to REPO/accumulate
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/../accumulate

go run ./tools/cmd/gen-enum -l typescript -o ../src/api_v2/enums_gen.ts internal/api/v2/enums.yml
go run ./tools/cmd/gen-types -l typescript -o ../src/api_v2/types_gen.ts internal/api/v2/{responses,types}.yml --header='
import { BlockFilterMode, TxFetchMode } from ".";
import * as config from "./config";
import * as protocol from "./protocol";
import * as merkle from "../merkle";
import * as messaging from "../messaging";
import * as core from "../network";
import * as errors2 from "../errors";
import { URL, TxID } from "../url";
'

go run ./tools/cmd/gen-enum -l typescript -o ../src/api_v2/config_enums_gen.ts internal/node/config/enums.yml
go run ./tools/cmd/gen-types -l typescript -o ../src/api_v2/config_types_gen.ts internal/node/config/types.yml \
  -x P2P \
  --header='
import * as protocol from "./protocol";
import { NodeType } from "./config";
'

go run ./tools/cmd/gen-enum -l typescript -o ../src/errors/enums_gen.ts pkg/errors/status.yml
go run ./tools/cmd/gen-types -l typescript -o ../src/errors/types_gen.ts pkg/errors/error.yml --header='
import { Status } from ".";
'

go run ./tools/cmd/gen-types -l typescript -o ../src/network/types_gen.ts pkg/types/network/types.yml --header='
import * as protocol from "../core";
'

go run ./tools/cmd/gen-enum -l typescript -o ../src/merkle/enums_gen.ts pkg/types/merkle/enums.yml
go run ./tools/cmd/gen-types -l typescript -o ../src/merkle/types_gen.ts pkg/types/merkle/types.yml --header='
import { ChainType } from ".";
'

go run ./tools/cmd/gen-enum -l typescript -o ../src/messaging/enums_gen.ts pkg/types/messaging/enums.yml
go run ./tools/cmd/gen-types -l typescript-union -o ../src/messaging/unions_gen.ts pkg/types/messaging/messages.yml \
  -x BlockSummary
go run ./tools/cmd/gen-types -l typescript -o ../src/messaging/types_gen.ts pkg/types/messaging/messages.yml \
  -x BlockSummary,RecordUpdate,StateTreeUpdate \
  --header='
import { Message, MessageType } from ".";
import * as protocol from "../core";
import { TxID, URL } from "../url";
'

go run ./tools/cmd/gen-enum -l typescript -o ../src/core/enums_gen.ts protocol/enums.yml
go run ./tools/cmd/gen-types -l typescript-union -o ../src/core/unions_gen.ts \
    protocol/{accounts,account_auth_operations,general,key_page_operations,signatures,synthetic_transactions,system,transaction,transaction_results,user_transactions}.yml

go run ./tools/cmd/gen-types -l typescript -o ../src/core/types_gen.ts \
    protocol/{accounts,account_auth_operations,general,key_page_operations,signatures,synthetic_transactions,system,transaction,transaction_results,user_transactions}.yml \
    -x Object \
    --header='
import * as errors2 from "../errors";
import * as merkle from "../merkle";
import { ChainType } from "../merkle";
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
yarn prettier --config .prettierrc --write src{,/**}/*.ts