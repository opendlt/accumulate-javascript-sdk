/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  ChainQueryResponse,
  DescriptionResponse,
  ExecuteRequestArgs,
  GeneralQueryArgs,
  MinorBlocksQueryArgs,
  QueryOptionsArgs,
  QueryPaginationArgs,
  StatusResponse,
  TxHistoryQueryArgs,
  TxnQueryArgs,
  TxResponse,
} from ".";
import { TxID } from "../address";
import { AccumulateURL as URL } from "../address/url";
import { sha256 } from "../common/crypto";
import { sleep } from "../common/util";
import {
  AccountAuthOperationArgs,
  AddCredits,
  AddCreditsArgs,
  ANCHORS_URL,
  BurnTokens,
  BurnTokensArgs,
  CreateDataAccount,
  CreateDataAccountArgs,
  CreateIdentity,
  CreateIdentityArgs,
  CreateKeyBook,
  CreateKeyBookArgs,
  CreateKeyPage,
  CreateKeyPageArgs,
  CreateToken,
  CreateTokenAccount,
  CreateTokenAccountArgs,
  CreateTokenArgs,
  IssueTokens,
  IssueTokensArgs,
  KeyPageOperationArgs,
  SendTokens,
  SendTokensArgs,
  Transaction,
  TransactionBody,
  TransactionHeader,
  UpdateAccountAuth,
  UpdateKey,
  UpdateKeyArgs,
  UpdateKeyPage,
  WriteData,
  WriteDataArgs,
} from "../core";
import { Envelope } from "../messaging";
import { Signer, SignerWithVersion } from "../signing";
import { RpcClient } from "./rpc-client";

/**
 * Options for waiting on transaction delivering.
 */
export type WaitTxOptions = {
  /**
   * Timeout after which status polling is aborted. Duration in ms.
   * Default: 30000ms (30s)
   */
  timeout?: number;
  /**
   * Interval between each tx status poll. Duration in ms.
   * Default: 500ms.
   */
  pollInterval?: number;
  /**
   * If set to true, only the user tx status is checked.
   * If set to false, will also wait on the associated synthetic txs to be delivered.
   * Default: false
   */
  ignoreSyntheticTxs?: boolean;
};

export class TxError extends Error {
  readonly txId: string;
  readonly status: any;

  constructor(txId: string, status: any) {
    super(`Failed transaction ${txId}: ${JSON.stringify(status, null, 4)}`);
    this.txId = txId;
    this.status = status;
  }
}

export type TxResponse2 = TxResponse & { txid: TxID };

/**
 * Client to call Accumulate RPC APIs.
 */
export class Client {
  private readonly _rpcClient: RpcClient;

  constructor(endpoint: string) {
    this._rpcClient = new RpcClient(endpoint);
  }

  /**
   * Direct RPC call.
   * @param method RPC method
   * @param params method parameters
   */
  async call<T>(method: string, params?: any): Promise<T> {
    return this._rpcClient.call(method, params);
  }

  /******************
   * Queries
   ******************/

  queryAcmeOracle(): Promise<number> {
    return this.describe().then((d) => d.values!.oracle!.price!);
  }

  queryAnchor(anchor: string): Promise<any> {
    return this.queryUrl(ANCHORS_URL.join(`#anchor/${anchor}`));
  }

  queryUrl(url: string | URL, options?: Omit<GeneralQueryArgs, "url">): Promise<any> {
    const urlStr = url.toString();

    return this.call("query", {
      url: urlStr,
      ...options,
    });
  }

  queryTx(txId: string | URL, options?: Omit<TxnQueryArgs, "txid" | "txidUrl">): Promise<any> {
    const txIdStr = txId.toString();
    const paramName = txIdStr.startsWith("acc://") ? "txIdUrl" : "txid";

    return this.call("query-tx", {
      [paramName]: txIdStr,
      ...options,
    });
  }

  queryTxHistory(
    url: string | URL,
    pagination: QueryPaginationArgs,
    options?: Omit<TxHistoryQueryArgs, "url" | keyof QueryPaginationArgs>
  ): Promise<any> {
    const urlStr = url.toString();
    return this.call("query-tx-history", {
      url: urlStr,
      ...pagination,
      ...options,
    });
  }

  queryDirectory(
    url: string | URL,
    pagination: QueryPaginationArgs,
    options?: QueryOptionsArgs
  ): Promise<any> {
    return this.call("query-directory", {
      url: url.toString(),
      ...pagination,
      ...options,
    });
  }

  queryData(url: string | URL, entryHash?: string): Promise<any> {
    return this.call("query-data", {
      url: url.toString(),
      entryHash,
    });
  }

  queryDataSet(
    url: string | URL,
    pagination: QueryPaginationArgs,
    options?: QueryOptionsArgs
  ): Promise<any> {
    return this.call("query-data-set", {
      url: url.toString(),
      ...pagination,
      ...options,
    });
  }

  queryKeyPageIndex(url: string | URL, key: string | Uint8Array): Promise<any> {
    const urlStr = url.toString();
    const keyStr = key instanceof Uint8Array ? Buffer.from(key).toString("hex") : key;

    return this.call("query-key-index", {
      url: urlStr,
      key: keyStr,
    });
  }

  queryMajorBlocks(url: string | URL, pagination: QueryPaginationArgs): Promise<any> {
    return this.call("query-major-blocks", {
      url: url.toString(),
      ...pagination,
    });
  }

  queryMinorBlocks(
    url: string | URL,
    pagination: QueryPaginationArgs,
    options?: Omit<MinorBlocksQueryArgs, "url" | keyof QueryPaginationArgs>
  ): Promise<any> {
    return this.call("query-minor-blocks", {
      url: url.toString(),
      ...pagination,
      ...options,
    });
  }

  async querySignerVersion(signer: Signer | URL, publicKeyHash?: Uint8Array): Promise<number> {
    let signerUrl: URL;
    let pkh: Uint8Array;
    if (signer instanceof URL) {
      signerUrl = signer;
      if (!publicKeyHash) {
        throw new Error("Missing public key hash");
      }
      pkh = publicKeyHash;
    } else {
      signerUrl = signer.url;
      pkh = await sha256(signer.key.address.publicKey);
    }

    const {
      data: { keyPage },
    } = await this.queryKeyPageIndex(signerUrl, pkh);

    const res = await this.queryUrl(keyPage);
    return res.data.version;
  }

  /**
   * Wait for a transaction (and its associated synthetic tx ids) to be delivered.
   * Throw an error if the transaction has failed or the timeout is exhausted.
   * @param txId
   * @param options
   * @returns void
   */
  async waitOnTx(txId: string, options?: WaitTxOptions): Promise<void> {
    // Options
    const to = options?.timeout ?? 30_000;
    const pollInterval = options?.pollInterval ?? 500;
    const ignoreSyntheticTxs = options?.ignoreSyntheticTxs ?? false;

    const start = Date.now();
    let lastError;
    do {
      try {
        const { status, syntheticTxids } = await this.queryTx(txId);

        switch (status.code) {
          case "pending":
          case "remote":
            await sleep(pollInterval);
            continue;
          case "delivered":
            break;
          default:
            throw new TxError(txId, status);
        }

        if (ignoreSyntheticTxs) {
          return;
        }

        // Also verify the associated synthetic txs
        const timeoutLeft = to - Date.now() + start;
        const stxIds: string[] = syntheticTxids || [];
        await Promise.all(
          stxIds.map((stxId) =>
            this.waitOnTx(stxId, {
              timeout: timeoutLeft,
              pollInterval: options?.pollInterval,
              ignoreSyntheticTxs: options?.ignoreSyntheticTxs,
            })
          )
        );
        return;
      } catch (e) {
        // Do not retry on definitive transaction errors
        if (e instanceof TxError) {
          throw e;
        }

        lastError = e;
        await sleep(pollInterval);
      }
      // Poll while timeout is not reached
    } while (Date.now() - start < to);

    throw new Error(
      `Transaction ${txId} was not confirmed within ${to / 1000}s. Cause: ${lastError}`
    );
  }

  /******************
   * Transactions
   ******************/

  addCredits(
    principal: URL | string,
    addCredits: AddCreditsArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new AddCredits(addCredits), signer);
  }

  burnTokens(
    principal: URL | string,
    burnTokens: BurnTokensArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new BurnTokens(burnTokens), signer);
  }

  createDataAccount(
    principal: URL | string,
    createDataAccount: CreateDataAccountArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new CreateDataAccount(createDataAccount), signer);
  }

  createIdentity(
    principal: URL | string,
    createIdentity: CreateIdentityArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new CreateIdentity(createIdentity), signer);
  }

  createKeyBook(
    principal: URL | string,
    createKeyBook: CreateKeyBookArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new CreateKeyBook(createKeyBook), signer);
  }

  createKeyPage(
    principal: URL | string,
    createKeyPage: CreateKeyPageArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new CreateKeyPage(createKeyPage), signer);
  }

  createToken(
    principal: URL | string,
    createToken: CreateTokenArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new CreateToken(createToken), signer);
  }

  createTokenAccount(
    principal: URL | string,
    createTokenAccount: CreateTokenAccountArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new CreateTokenAccount(createTokenAccount), signer);
  }

  issueTokens(
    principal: URL | string,
    issueTokens: IssueTokensArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new IssueTokens(issueTokens), signer);
  }

  sendTokens(
    principal: URL | string,
    sendTokens: SendTokensArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new SendTokens(sendTokens), signer);
  }

  updateAccountAuth(
    principal: URL | string,
    operation: AccountAuthOperationArgs | AccountAuthOperationArgs[],
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    const operations = operation instanceof Array ? operation : [operation];
    return this._execute(URL.parse(principal), new UpdateAccountAuth({ operations }), signer);
  }

  updateKey(
    principal: URL | string,
    updateKey: UpdateKeyArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new UpdateKey(updateKey), signer);
  }

  updateKeyPage(
    principal: URL | string,
    operation: KeyPageOperationArgs | KeyPageOperationArgs[],
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    const operations = operation instanceof Array ? operation : [operation];
    return this._execute(
      URL.parse(principal),
      new UpdateKeyPage({ operation: operations }),
      signer
    );
  }

  writeData(
    principal: URL | string,
    writeData: WriteDataArgs,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    return this._execute(URL.parse(principal), new WriteData(writeData), signer);
  }

  private async _execute(
    principal: URL,
    payload: TransactionBody,
    signer: SignerWithVersion
  ): Promise<TxResponse2> {
    const header = new TransactionHeader({ principal });
    const tx = new Transaction({ body: payload, header });
    const sig = await signer.sign(tx, { timestamp: Date.now() });
    const env = new Envelope({
      transaction: [tx],
      signatures: [sig],
    });
    return this.execute(env);
  }

  async execute(env: Envelope): Promise<TxResponse2> {
    const req: ExecuteRequestArgs = {
      envelope: env.asObject(),
    };
    const res: TxResponse2 = await this.call("execute-direct", req);
    if (res.result.error) {
      throw res.result.error;
    }
    return res;
  }

  /******************
   * Others
   ******************/

  async faucet(url: string | URL): Promise<TxResponse2> {
    const res: TxResponse2 = await this.call("faucet", {
      url: url.toString(),
    });
    if (res.result.error) {
      throw res.result.error;
    }
    return res;
  }

  status(): Promise<StatusResponse> {
    return this.call("status");
  }

  version(): Promise<ChainQueryResponse> {
    return this.call("version");
  }

  describe(): Promise<DescriptionResponse> {
    return this.call("describe");
  }

  metrics(metric: string, duration: number): Promise<ChainQueryResponse> {
    return this.call("metrics", {
      metric,
      duration,
    });
  }
}
