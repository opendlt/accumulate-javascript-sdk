#!/bin/bash

set -eu

# Change directory to REPO/accumulate
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/../accumulate

function gen {
  go run gitlab.com/accumulatenetwork/accumulate/tools/cmd/gen-$1 "${@:2}"
}

gen enum -l typescript -o ../src/api_v3/msg_enums_gen.ts pkg/api/v3/message/enums.yml
gen types -l typescript -o ../src/api_v3/msg_types_gen.ts --elide-package-type \
  pkg/api/v3/message/{messages,private}.yml \
  -x Addressed,MetricsRequest,MetricsResponse \
  --reference pkg/api/v3/options.yml \
  --header='
import * as api from ".";
import * as errors2 from "../errors";
import * as messaging from "../messaging";
import { MessageType } from "./msg";
import * as p2p from "./p2p";
import { AccumulateURL as URL, URLArgs } from "../address/url";
import { AccumulateTxID as TxID, TxIDArgs } from "../address/txid";
'
gen types -l typescript-union -o ../src/api_v3/msg_unions_gen.ts --elide-package-type \
  pkg/api/v3/message/{messages,private}.yml \
  --reference pkg/api/v3/options.yml \
  -x Addressed,MetricsRequest,MetricsResponse \
  --header='
import * as types from "./msg";
'

gen enum -l typescript -o ../src/api_v3/enums_gen.ts pkg/api/v3/enums.yml
gen types -l typescript -o ../src/api_v3/types_gen.ts --long-union-discriminator \
  pkg/api/v3/{responses,options,records,events,types,queries}.yml \
  --reference pkg/types/merkle/types.yml,protocol/general.yml \
  -x=Metrics,MetricsOptions \
  --header='
import { Record, RecordArgs } from ".";
import * as messaging from "../messaging";
import * as core from "../network";
import * as errors2 from "../errors";
import * as merkle from "../merkle";
import * as protocol from "../core";
import { AccumulateURL as URL, URLArgs } from "../address/url";
import { AccumulateTxID as TxID, TxIDArgs } from "../address/txid";
import { EventType, QueryType, RecordType, ServiceType } from "./enums_gen";
import * as p2p from "./p2p";
'
gen types -l typescript-union -o ../src/api_v3/unions_gen.ts  --long-union-discriminator \
  pkg/api/v3/{records,events,queries}.yml \
  --reference pkg/api/v3/options.yml \
  --header='
import * as types from ".";
import * as messaging from "../messaging";
'

gen enum -l typescript -o ../src/api_v2/enums_gen.ts internal/api/v2/enums.yml
gen types -l typescript -o ../src/api_v2/types_gen.ts internal/api/v2/{responses,types}.yml --header='
import { BlockFilterMode, BlockFilterModeArgs, TxFetchMode, TxFetchModeArgs } from ".";
import * as config from "./config";
import * as protocol from "./protocol";
import * as merkle from "../merkle";
import * as messaging from "../messaging";
import * as core from "../network";
import * as errors2 from "../errors";
import { AccumulateURL as URL, URLArgs } from "../address/url";
import { AccumulateTxID as TxID, TxIDArgs } from "../address/txid";
'

gen enum -l typescript -o ../src/api_v2/config_enums_gen.ts internal/node/config/enums.yml
gen types -l typescript -o ../src/api_v2/config_types_gen.ts internal/node/config/types.yml \
  -x P2P \
  --header='
import * as protocol from "./protocol";
import { NodeType, NodeTypeArgs } from "./config";
'

gen enum -l typescript -o ../src/errors/enums_gen.ts pkg/errors/status.yml
gen types -l typescript -o ../src/errors/types_gen.ts pkg/errors/error.yml --header='
import { Status, StatusArgs } from ".";
'

gen types -l typescript -o ../src/network/types_gen.ts pkg/types/network/types.yml --header='
import * as protocol from "../core";
'

gen enum -l typescript -o ../src/merkle/enums_gen.ts pkg/types/merkle/enums.yml
gen types -l typescript -o ../src/merkle/types_gen.ts pkg/types/merkle/types.yml --header='
import { ChainType } from ".";
'

gen enum -l typescript -o ../src/messaging/enums_gen.ts pkg/types/messaging/enums.yml
gen types -l typescript-union -o ../src/messaging/unions_gen.ts pkg/types/messaging/messages.yml \
  -x BlockSummary \
  --header='
import * as types from ".";
'
gen types -l typescript -o ../src/messaging/types_gen.ts pkg/types/messaging/messages.yml \
  -x BlockSummary,RecordUpdate,StateTreeUpdate \
  --header='
import { Message, MessageArgs, MessageType } from ".";
import * as protocol from "../core";
import { AccumulateURL as URL, URLArgs } from "../address/url";
import { AccumulateTxID as TxID, TxIDArgs } from "../address/txid";
'

gen enum -l typescript -o ../src/core/enums_gen.ts protocol/enums.yml
gen types -l typescript-union -o ../src/core/unions_gen.ts \
    protocol/{accounts,account_auth_operations,general,key_page_operations,signatures,synthetic_transactions,system,transaction,transaction_results,user_transactions}.yml \
  --header='
import * as types from ".";
'

gen types -l typescript -o ../src/core/types_gen.ts \
    protocol/{accounts,account_auth_operations,general,key_page_operations,signatures,synthetic_transactions,system,transaction,transaction_results,user_transactions}.yml \
    -x Object \
    --header='
import { ChainType, ChainTypeArgs } from "../merkle";
import * as errors2 from "../errors";
import * as merkle from "../merkle";
import { AccumulateURL as URL, URLArgs } from "../address/url";
import { AccumulateTxID as TxID, TxIDArgs } from "../address/txid";
import { TransactionBase } from "./base";
import {
  Account,
  AccountArgs,
  AccountAuthOperation,
  AccountAuthOperationArgs,
  AccountAuthOperationType,
  AccountType,
  AllowedTransactions,
  AllowedTransactionsArgs,
  AnchorBody,
  AnchorBodyArgs,
  BookType,
  BookTypeArgs,
  DataEntry,
  DataEntryArgs,
  DataEntryType,
  ExecutorVersion,
  ExecutorVersionArgs,
  Fee,
  FeeArgs,
  KeyPageOperation,
  KeyPageOperationArgs,
  KeyPageOperationType,
  PartitionType,
  PartitionTypeArgs,
  Signature,
  SignatureArgs,
  SignatureType,
  Signer,
  SignerArgs,
  TransactionBody,
  TransactionBodyArgs,
  TransactionResult,
  TransactionResultArgs,
  TransactionType,
  TransactionTypeArgs,
  VoteType,
  VoteTypeArgs,
} from ".";
'

# Change directory to REPO/, format everything
cd $SCRIPT_DIR/..
yarn prettier --config .prettierrc --write src{,/**}/*.ts