/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ANCHORS_URL } from "../core";
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
import {
  AccountAuthOperationArgs,
  AddCredits,
  AddCreditsArgs,
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
import { sha256 } from "../crypto";
import { Envelope } from "../messaging";
import { RpcClient } from "../rpc-client";
import { signTransaction } from "../signing";
import { PageSigner } from "../signing/signer";
import { URL } from "../url";
import { sleep } from "../util";

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

  async querySignerVersion(signer: PageSigner | URL, publicKeyHash?: Uint8Array): Promise<number> {
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
      pkh = await sha256(signer.publicKey);
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
    signer: PageSigner
  ): Promise<any> {
    return this._execute(URL.parse(principal), new AddCredits(addCredits), signer);
  }

  burnTokens(
    principal: URL | string,
    burnTokens: BurnTokensArgs,
    signer: PageSigner
  ): Promise<any> {
    return this._execute(URL.parse(principal), new BurnTokens(burnTokens), signer);
  }

  createDataAccount(
    principal: URL | string,
    createDataAccount: CreateDataAccountArgs,
    signer: PageSigner
  ): Promise<any> {
    return this._execute(URL.parse(principal), new CreateDataAccount(createDataAccount), signer);
  }

  createIdentity(
    principal: URL | string,
    createIdentity: CreateIdentityArgs,
    signer: PageSigner
  ): Promise<any> {
    return this._execute(URL.parse(principal), new CreateIdentity(createIdentity), signer);
  }

  createKeyBook(
    principal: URL | string,
    createKeyBook: CreateKeyBookArgs,
    signer: PageSigner
  ): Promise<any> {
    return this._execute(URL.parse(principal), new CreateKeyBook(createKeyBook), signer);
  }

  createKeyPage(
    principal: URL | string,
    createKeyPage: CreateKeyPageArgs,
    signer: PageSigner
  ): Promise<any> {
    return this._execute(URL.parse(principal), new CreateKeyPage(createKeyPage), signer);
  }

  createToken(
    principal: URL | string,
    createToken: CreateTokenArgs,
    signer: PageSigner
  ): Promise<any> {
    return this._execute(URL.parse(principal), new CreateToken(createToken), signer);
  }

  createTokenAccount(
    principal: URL | string,
    createTokenAccount: CreateTokenAccountArgs,
    signer: PageSigner
  ): Promise<any> {
    return this._execute(URL.parse(principal), new CreateTokenAccount(createTokenAccount), signer);
  }

  async execute(env: Envelope): Promise<TxResponse> {
    const req: ExecuteRequestArgs = {
      envelope: env.asObject(),
    };
    const res: TxResponse = await this.call("execute-direct", req);
    if (res.result.error) {
      throw res.result.error;
    }
    return res;
  }

  issueTokens(
    principal: URL | string,
    issueTokens: IssueTokensArgs,
    signer: PageSigner
  ): Promise<any> {
    return this._execute(URL.parse(principal), new IssueTokens(issueTokens), signer);
  }

  sendTokens(
    principal: URL | string,
    sendTokens: SendTokensArgs,
    signer: PageSigner
  ): Promise<any> {
    return this._execute(URL.parse(principal), new SendTokens(sendTokens), signer);
  }

  updateAccountAuth(
    principal: URL | string,
    operation: AccountAuthOperationArgs | AccountAuthOperationArgs[],
    signer: PageSigner
  ): Promise<any> {
    const operations = operation instanceof Array ? operation : [operation];
    return this._execute(URL.parse(principal), new UpdateAccountAuth({ operations }), signer);
  }

  updateKey(principal: URL | string, updateKey: UpdateKeyArgs, signer: PageSigner): Promise<any> {
    return this._execute(URL.parse(principal), new UpdateKey(updateKey), signer);
  }

  updateKeyPage(
    principal: URL | string,
    operation: KeyPageOperationArgs | KeyPageOperationArgs[],
    signer: PageSigner
  ): Promise<any> {
    const operations = operation instanceof Array ? operation : [operation];
    return this._execute(
      URL.parse(principal),
      new UpdateKeyPage({ operation: operations }),
      signer
    );
  }

  writeData(principal: URL | string, writeData: WriteDataArgs, signer: PageSigner): Promise<any> {
    return this._execute(URL.parse(principal), new WriteData(writeData), signer);
  }

  private async _execute(
    principal: URL,
    payload: TransactionBody,
    signer: PageSigner
  ): Promise<any> {
    const header = new TransactionHeader({ principal });
    const tx = new Transaction({ body: payload, header });
    const env = await signTransaction(tx, signer, {
      timestamp: Date.now(),
    });

    return this.execute(env);
  }

  /******************
   * Others
   ******************/

  async faucet(url: string | URL): Promise<TxResponse> {
    const res: TxResponse = await this.call("faucet", {
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
