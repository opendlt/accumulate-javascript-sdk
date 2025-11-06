#!/bin/bash

set -eu

# Change directory to REPO/accumulate
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
cd $SCRIPT_DIR/../accumulate

function gen {
  go run gitlab.com/accumulatenetwork/accumulate/tools/cmd/gen-$1 "${@:2}"
}

echo "api_v3/msg_{enums,types,unions}"
gen enum -l typescript -o ../src/api_v3/msg_enums_gen.ts pkg/api/v3/message/enums.yml
gen types -l typescript -o ../src/api_v3/msg_types_gen.ts --elide-package-type \
  pkg/api/v3/message/{messages,private}.yml \
  -x Addressed,MetricsRequest,MetricsResponse \
  --reference api:pkg/api/v3/options.yml \
  --reference private:internal/api/private/types.yml \
  --header='
import * as api from ".";
import * as errors2 from "../errors";
import * as messaging from "../messaging";
import { MessageType } from "./msg";
import * as p2p from "./p2p";
import { AccumulateURL as URL, URLArgs } from "../address/url";
import { AccumulateTxID as TxID, TxIDArgs } from "../address/txid";
import { Buffer } from "../common/buffer";
'
gen types -l typescript-union -o ../src/api_v3/msg_unions_gen.ts --elide-package-type \
  pkg/api/v3/message/{messages,private}.yml \
  --reference api:pkg/api/v3/options.yml \
  -x Addressed,MetricsRequest,MetricsResponse \
  --reference private:internal/api/private/types.yml \
  --header='
import * as types from "./msg";
import { Buffer } from "../common/buffer";
'

echo "api_v3/{enums,types,unions}"
gen enum -l typescript -o ../src/api_v3/enums_gen.ts pkg/api/v3/enums.yml
gen types -l typescript -o ../src/api_v3/types_gen.ts --long-union-discriminator \
  pkg/api/v3/{responses,options,records,events,types,queries}.yml \
  --reference pkg/database/merkle/types.yml,protocol/general.yml \
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
import { EventType, KnownPeerStatus, KnownPeerStatusArgs, QueryType, RecordType, ServiceType } from "./enums_gen";
import * as p2p from "./p2p";
import { Buffer } from "../common/buffer";
'
gen types -l typescript-union -o ../src/api_v3/unions_gen.ts  --long-union-discriminator \
  pkg/api/v3/{records,events,queries}.yml \
  --reference pkg/api/v3/options.yml \
  --header='
import * as types from ".";
import * as messaging from "../messaging";
import { Buffer } from "../common/buffer";
'

echo "api_v2/{enums,types}"
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
import { Buffer } from "../common/buffer";
'

echo "api_v2/config_{enums,types}"
gen enum -l typescript -o ../src/api_v2/config_enums_gen.ts internal/node/config/enums.yml
gen types -l typescript -o ../src/api_v2/config_types_gen.ts internal/node/config/types.yml \
  -x P2P \
  --header='
import * as protocol from "./protocol";
import { NodeType, NodeTypeArgs } from "./config";
import { Buffer } from "../common/buffer";
'

# The Go SDK is doing some shenanigans with Error so we're just going to not regenerate the error types.
echo "errors/{enums,types}"
gen enum -l typescript -o ../src/errors/enums_gen.ts pkg/errors/status.yml
# gen types -l typescript -o ../src/errors/types_gen.ts pkg/errors/error.yml --header='
# import { Status, StatusArgs } from ".";
# import { Buffer } from "../common/buffer";
# '

echo "network/types"
gen types -l typescript -o ../src/network/types_gen.ts pkg/types/network/types.yml --header='
import * as protocol from "../core";
import { Buffer } from "../common/buffer";
'

echo "merkle/{enums,types}"
gen enum -l typescript -o ../src/merkle/enums_gen.ts pkg/database/merkle/enums.yml
gen types -l typescript -o ../src/merkle/types_gen.ts pkg/database/merkle/types.yml \
  -x chainIndexBlock,chainIndexEntry \
  --header='
import { ChainType } from ".";
import { Buffer } from "../common/buffer";
'

echo "messaging/{enums,types,unions}"
gen enum -l typescript -o ../src/messaging/enums_gen.ts pkg/types/messaging/enums.yml
gen types -l typescript-union -o ../src/messaging/unions_gen.ts pkg/types/messaging/messages.yml \
  -x BlockSummary \
  --header='
import * as types from ".";
import { Buffer } from "../common/buffer";
'
gen types -l typescript -o ../src/messaging/types_gen.ts pkg/types/messaging/messages.yml \
  -x BlockSummary,RecordUpdate,StateTreeUpdate \
  --header='
import { Message, MessageArgs, MessageType } from ".";
import * as protocol from "../core";
import { AccumulateURL as URL, URLArgs } from "../address/url";
import { AccumulateTxID as TxID, TxIDArgs } from "../address/txid";
import { Buffer } from "../common/buffer";
'

echo "core/{enums,types,unions}"
gen enum -l typescript -o ../src/core/enums_gen.ts protocol/enums.yml
gen types -l typescript-union -o ../src/core/unions_gen.ts \
    protocol/{accounts,operations,general,key_page_operations,signatures,synthetic_transactions,system,transaction,transaction_results,user_transactions}.yml \
  --header='
import * as types from ".";
import { Buffer } from "../common/buffer";
'

gen types -l typescript -o ../src/core/types_gen.ts \
    protocol/{accounts,operations,general,key_page_operations,signatures,synthetic_transactions,system,transaction,transaction_results,user_transactions}.yml \
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
  NetworkMaintenanceOperation,
  NetworkMaintenanceOperationArgs,
  NetworkMaintenanceOperationType,
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
import { Buffer } from "../common/buffer";
'

# Change directory to REPO/, format everything
cd $SCRIPT_DIR/..
yarn prettier --config .prettierrc --write src{,/**}/*.ts