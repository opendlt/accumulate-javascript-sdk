import * as types from ".";
import { errors, messaging, URLArgs } from "..";
import { RpcClient, RpcError } from "../rpc-client";
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

  query(scope: URLArgs, query: types.QueryArgs = { queryType: "default" }): Promise<types.Record> {
    return this.typedCall("query", { scope, query }, msg.QueryRequest, types.Record);
  }

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

  faucet(account: URLArgs, opts: types.FaucetOptionsArgs = {}): Promise<types.Submission[]> {
    return this.typedCall2("faucet", { account, ...opts }, msg.FaucetRequest, types.Submission);
  }
}
