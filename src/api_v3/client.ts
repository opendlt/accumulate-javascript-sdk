import * as types from ".";
import { TxID, URLArgs } from "../address";
import * as errors from "../errors";
import * as messaging from "../messaging";
import { RpcClient, RpcError } from "../api_v2/rpc-client";
import * as msg from "./msg";

export const ERR_CODE_PROTOCOL = -33000;

export class JsonRpcClient {
  private readonly _rpcClient: RpcClient;

  constructor(endpoint: string) {
    this._rpcClient = new RpcClient(endpoint);
  }

  /**
   * Direct RPC call.
   * @param method RPC method
   * @param params method parameters
   */
  async call<V = any>(method: string, params?: any): Promise<V> {
    try {
      return await this._rpcClient.call(method, params);
    } catch (error) {
      if (!(error instanceof RpcError) || error.code > ERR_CODE_PROTOCOL) throw error;
      try {
        const raw = JSON.parse(error.data);
        return Promise.reject(new errors.Error(raw));
      } catch (_) {
        throw error;
      }
    }
  }

  private async typedCall<In extends { asObject(): any }, InArgs, Out, OutArgs>(
    method: string,
    params: InArgs,
    inType: { new (args: InArgs): In },
    outType: { new (args: OutArgs): Out } | { fromObject(args: OutArgs): Out }
  ) {
    const res = await this.call(method, new inType(params).asObject());
    return "fromObject" in outType ? outType.fromObject(res) : new outType(res);
  }

  private async typedCall2<In extends { asObject(): any }, InArgs, Out, OutArgs>(
    method: string,
    params: InArgs,
    inType: { new (args: InArgs): In },
    outType: { new (args: OutArgs): Out } | { fromObject(args: OutArgs): Out }
  ) {
    const res = (await this.call(method, new inType(params).asObject())) as any[];
    return "fromObject" in outType
      ? res.map((x) => outType.fromObject(x))
      : res.map((x) => new outType(x));
  }

  consensusStatus(opts: types.ConsensusStatusOptionsArgs = {}): Promise<types.ConsensusStatus> {
    return this.typedCall(
      "consensus-status",
      opts,
      msg.ConsensusStatusRequest,
      types.ConsensusStatus
    );
  }

  networkStatus(opts: types.NetworkStatusOptionsArgs = {}): Promise<types.NetworkStatus> {
    return this.typedCall("network-status", opts, msg.NetworkStatusRequest, types.NetworkStatus);
  }

  // metrics(opts: types.MetricsOptions = {}): Promise<types.Metrics> {
  //   return this.typedCall('metrics', opts, msg.MetricsRequest, types.Metrics);
  // }

  submit(
    envelope: messaging.EnvelopeArgs,
    opts: types.SubmitOptionsArgs = {}
  ): Promise<types.Submission[]> {
    return this.typedCall2("submit", { envelope, ...opts }, msg.SubmitRequest, types.Submission);
  }

  validate(
    envelope: messaging.EnvelopeArgs,
    opts: types.ValidateOptionsArgs = {}
  ): Promise<types.Submission[]> {
    return this.typedCall2(
      "validate",
      { envelope, ...opts },
      msg.ValidateRequest,
      types.Submission
    );
  }

  faucet(account: URLArgs, opts: types.FaucetOptionsArgs = {}): Promise<types.Submission> {
    return this.typedCall("faucet", { account, ...opts }, msg.FaucetRequest, types.Submission);
  }

  /**
   * Query an account by URL or message by ID.
   * @param scope The account URL or message ID
   * @param query The query
   * @returns An account or message
   */
  query(
    scope: URLArgs | TxID,
    query?: types.DefaultQueryArgsWithType
  ): Promise<types.AccountRecord | types.MessageRecord>;

  /**
   * List an account's chains.
   * @param scope The account URL
   * @param query The query
   * @returns A range of chains
   */
  query(
    scope: URLArgs,
    query: Pick<types.ChainQueryArgsWithType, "queryType">
  ): Promise<types.RecordRange<types.ChainRecord>>;

  /**
   * Get a chain.
   * @param scope The account URL
   * @param query The query
   * @returns The chain
   */
  query(
    scope: URLArgs,
    query: Pick<types.ChainQueryArgsWithType, "queryType" | "name">
  ): Promise<types.ChainRecord>;

  /**
   * Get a chain entry by index.
   * @param scope The account URL
   * @param query The query
   * @returns The chain entry
   */
  query(
    scope: URLArgs,
    query: Pick<types.ChainQueryArgsWithType, "queryType" | "name" | "index" | "includeReceipt">
  ): Promise<types.ChainEntryRecord>;

  /**
   * Get a chain entry by hash.
   * @param scope The account URL
   * @param query The query
   * @returns The chain entry
   */
  query(
    scope: URLArgs,
    query: Pick<types.ChainQueryArgsWithType, "queryType" | "name" | "entry" | "includeReceipt">
  ): Promise<types.ChainEntryRecord>;

  /**
   * Get a range of chain entries.
   * @param scope The account URL
   * @param query The query
   * @returns A range of chain entries
   */
  query(
    scope: URLArgs,
    query: Pick<types.ChainQueryArgsWithType, "queryType" | "name" | "range" | "includeReceipt">
  ): Promise<types.RecordRange<types.ChainEntryRecord>>;

  /**
   * Get the latest data entry.
   * @param scope The account URL
   * @param query The query
   * @returns The transaction chain entry
   */
  query(
    scope: URLArgs,
    query: Pick<types.DataQueryArgsWithType, "queryType">
  ): Promise<types.ChainEntryRecord<types.MessageRecord<messaging.TransactionMessage>>>;

  /**
   * Get a data entry by index.
   * @param scope The account URL
   * @param query The query
   * @returns The transaction chain entry
   */
  query(
    scope: URLArgs,
    query: Pick<types.DataQueryArgsWithType, "queryType" | "index">
  ): Promise<types.ChainEntryRecord<types.MessageRecord<messaging.TransactionMessage>>>;

  /**
   * Get a data entry by hash.
   * @param scope The account URL
   * @param query The query
   * @returns The transaction chain entry
   */
  query(
    scope: URLArgs,
    query: Pick<types.DataQueryArgsWithType, "queryType" | "entry">
  ): Promise<types.ChainEntryRecord<types.MessageRecord<messaging.TransactionMessage>>>;

  /**
   * Get a range of data entries.
   * @param scope The account URL
   * @param query The query
   * @returns A range of transaction chain entries
   */
  query(
    scope: URLArgs,
    query: Pick<types.DataQueryArgsWithType, "queryType" | "range">
  ): Promise<
    types.RecordRange<types.ChainEntryRecord<types.MessageRecord<messaging.TransactionMessage>>>
  >;

  /**
   * List an account's directory entries.
   * @param scope The account URL
   * @param query The query
   * @returns A range of account URLs
   */
  query(
    scope: URLArgs,
    query: Pick<types.DirectoryQueryArgsWithType, "queryType" | "range"> & {
      range: { expand?: false };
    }
  ): Promise<types.RecordRange<types.UrlRecord>>;

  /**
   * List an account's directory entries.
   * @param scope The account URL
   * @param query The query
   * @returns A range of accounts
   */
  query(
    scope: URLArgs,
    query: Pick<types.DirectoryQueryArgsWithType, "queryType" | "range"> & {
      range: { expand: true };
    }
  ): Promise<types.RecordRange<types.AccountRecord>>;

  /**
   * List an account's pending transactions.
   * @param scope The account URL
   * @param query The query
   * @returns A range of IDs or transactions
   */
  query(
    scope: URLArgs,
    query: Pick<types.PendingQueryArgsWithType, "queryType" | "range"> & {
      range: { expand?: false };
    }
  ): Promise<types.RecordRange<types.TxIDRecord>>;

  /**
   * List an account's pending transactions.
   * @param scope The account URL
   * @param query The query
   * @returns A range of IDs or transactions
   */
  query(
    scope: URLArgs,
    query: Pick<types.PendingQueryArgsWithType, "queryType" | "range"> & { range: { expand: true } }
  ): Promise<types.RecordRange<types.MessageRecord<messaging.TransactionMessage>>>;

  /**
   * Get a minor block.
   * @param scope The partition URL
   * @param query The query
   * @returns The minor block
   */
  query(
    scope: URLArgs,
    query: Pick<types.BlockQueryArgsWithType, "queryType" | "minor" | "entryRange" | "omitEmpty">
  ): Promise<types.MinorBlockRecord>;

  /**
   * Get a major block.
   * @param scope The partition URL
   * @param query The query
   * @returns The major block
   */
  query(
    scope: URLArgs,
    query: Pick<
      types.BlockQueryArgsWithType,
      "queryType" | "major" | "minorRange" | "entryRange" | "omitEmpty"
    >
  ): Promise<types.MajorBlockRecord>;

  /**
   * List minor blocks.
   * @param scope The partition URL
   * @param query The query
   * @returns A range of minor blocks
   */
  query(
    scope: URLArgs,
    query: Pick<types.BlockQueryArgsWithType, "queryType" | "minorRange" | "omitEmpty">
  ): Promise<types.RecordRange<types.MinorBlockRecord>>;

  /**
   * List major blocks.
   * @param scope The partition URL
   * @param query The query
   * @returns A range of major blocks
   */
  query(
    scope: URLArgs,
    query: Pick<types.BlockQueryArgsWithType, "queryType" | "majorRange" | "omitEmpty">
  ): Promise<types.RecordRange<types.MajorBlockRecord>>;

  /**
   * Search an account for an anchor chain entry.
   * @param scope The anchor ledger
   * @param query The query
   * @returns A range of chain entries
   */
  query(
    scope: URLArgs,
    query: Pick<types.AnchorSearchQueryArgsWithType, "queryType" | "anchor" | "includeReceipt">
  ): Promise<types.RecordRange<types.ChainEntryRecord<never>>>;

  /**
   * Search for a signer entry by public key within the authorities of the given
   * account. Remote authorities (those that belong to a different domain from
   * the account) are not searched.
   * @param scope The account URL
   * @param query The query
   * @returns A range of key records
   */
  query(
    scope: URLArgs,
    query: Pick<types.PublicKeySearchQueryArgsWithType, "queryType" | "publicKey" | "type">
  ): Promise<types.RecordRange<types.KeyRecord>>;

  /**
   * Search for a signer entry by public key hash within the authorities of the
   * given account. Remote authorities (those that belong to a different domain
   * from the account) are not searched.
   * @param scope The account URL
   * @param query The query
   * @returns A range of key records
   */
  query(
    scope: URLArgs,
    query: Pick<types.PublicKeyHashSearchQueryArgsWithType, "queryType" | "publicKeyHash">
  ): Promise<types.RecordRange<types.KeyRecord>>;

  /**
   * Search for a signer entry by delegate within the authorities of the given
   * account. Remote authorities (those that belong to a different domain from
   * the account) are not searched.
   * @param scope The account URL
   * @param query The query
   * @returns A range of key records
   */
  query(
    scope: URLArgs,
    query: Pick<types.DelegateSearchQueryArgsWithType, "queryType" | "delegate">
  ): Promise<types.RecordRange<types.KeyRecord>>;

  /**
   * Search for a message by hash.
   * @param scope The scope of the query or 'unknown'
   * @param query The query
   * @returns A range of messages
   */
  query(
    scope: URLArgs,
    query: Pick<types.MessageHashSearchQueryArgsWithType, "queryType" | "hash">
  ): Promise<types.RecordRange<types.MessageRecord>>;

  /**
   * Query the network.
   * @param scope The scope of the query
   * @param query The query
   * @returns A record
   */
  query(
    scope: URLArgs | TxID,
    query: types.QueryArgs = { queryType: "default" }
  ): Promise<types.Record> {
    if (scope instanceof TxID) scope = scope.asUrl();
    return this.typedCall("query", { scope, query }, msg.QueryRequest, types.Record);
  }
}
