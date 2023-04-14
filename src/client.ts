import { AccURL, ANCHORS_URL } from "./acc-url";
import {
  MinorBlocksQueryOptions,
  QueryOptions,
  QueryPagination,
  TxError,
  TxHistoryQueryOptions,
  TxQueryOptions,
  WaitTxOptions,
} from "./api-types";
import {
  AddCredits,
  BurnTokens,
  CreateDataAccount,
  CreateIdentity,
  CreateKeyBook,
  CreateKeyPage,
  CreateToken,
  CreateTokenAccount,
  IssueTokens,
  SendTokens,
  AccountAuthOperation,
  UpdateKey,
  UpdateKeyPage,
  UpdateAccountAuth,
  KeyPageOperation,
  WriteData,
  TransactionBody,
} from "../new/core";
import { RpcClient } from "./rpc-client";
import { Header, Transaction } from "./transaction";
import { TxSigner } from "./tx-signer";
import { sleep } from "./util";

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
    return this.describe().then((d) => d.values.oracle.price);
  }

  queryAnchor(anchor: string): Promise<any> {
    return this.queryUrl(ANCHORS_URL.join(`#anchor/${anchor}`));
  }

  queryUrl(url: string | AccURL, options?: QueryOptions): Promise<any> {
    const urlStr = url.toString();

    return this.call("query", {
      url: urlStr,
      ...options,
    });
  }

  queryTx(txId: string | AccURL, options?: TxQueryOptions): Promise<any> {
    const txIdStr = txId.toString();
    const paramName = txIdStr.startsWith("acc://") ? "txIdUrl" : "txid";

    return this.call("query-tx", {
      [paramName]: txIdStr,
      ...options,
    });
  }

  queryTxHistory(
    url: string | AccURL,
    pagination: QueryPagination,
    options?: TxHistoryQueryOptions
  ): Promise<any> {
    const urlStr = url.toString();
    return this.call("query-tx-history", {
      url: urlStr,
      ...pagination,
      ...options,
    });
  }

  queryDirectory(
    url: string | AccURL,
    pagination: QueryPagination,
    options?: QueryOptions
  ): Promise<any> {
    return this.call("query-directory", {
      url: url.toString(),
      ...pagination,
      ...options,
    });
  }

  queryData(url: string | AccURL, entryHash?: string): Promise<any> {
    return this.call("query-data", {
      url: url.toString(),
      entryHash,
    });
  }

  queryDataSet(
    url: string | AccURL,
    pagination: QueryPagination,
    options?: QueryOptions
  ): Promise<any> {
    return this.call("query-data-set", {
      url: url.toString(),
      ...pagination,
      ...options,
    });
  }

  queryKeyPageIndex(url: string | AccURL, key: string | Uint8Array): Promise<any> {
    const urlStr = url.toString();
    const keyStr = key instanceof Uint8Array ? Buffer.from(key).toString("hex") : key;

    return this.call("query-key-index", {
      url: urlStr,
      key: keyStr,
    });
  }

  queryMajorBlocks(url: string | AccURL, pagination: QueryPagination): Promise<any> {
    return this.call("query-major-blocks", {
      url: url.toString(),
      ...pagination,
    });
  }

  queryMinorBlocks(
    url: string | AccURL,
    pagination: QueryPagination,
    options?: MinorBlocksQueryOptions
  ): Promise<any> {
    return this.call("query-minor-blocks", {
      url: url.toString(),
      ...pagination,
      ...options,
    });
  }

  async querySignerVersion(signer: TxSigner | AccURL, publicKeyHash?: Uint8Array): Promise<number> {
    let signerUrl: AccURL;
    let pkh: Uint8Array;
    if (signer instanceof AccURL) {
      signerUrl = signer;
      if (!publicKeyHash) {
        throw new Error("Missing public key hash");
      }
      pkh = publicKeyHash;
    } else {
      signerUrl = signer.url;
      pkh = signer.publicKeyHash;
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
    principal: AccURL | string,
    addCredits: AddCredits.Args,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.parse(principal), new AddCredits(addCredits), signer);
  }

  burnTokens(
    principal: AccURL | string,
    burnTokens: BurnTokens.Args,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.parse(principal), new BurnTokens(burnTokens), signer);
  }

  createDataAccount(
    principal: AccURL | string,
    createDataAccount: CreateDataAccount.Args,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(
      AccURL.parse(principal),
      new CreateDataAccount(createDataAccount),
      signer
    );
  }

  createIdentity(
    principal: AccURL | string,
    createIdentity: CreateIdentity.Args,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.parse(principal), new CreateIdentity(createIdentity), signer);
  }

  createKeyBook(
    principal: AccURL | string,
    createKeyBook: CreateKeyBook.Args,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.parse(principal), new CreateKeyBook(createKeyBook), signer);
  }

  createKeyPage(
    principal: AccURL | string,
    createKeyPage: CreateKeyPage.Args,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.parse(principal), new CreateKeyPage(createKeyPage), signer);
  }

  createToken(
    principal: AccURL | string,
    createToken: CreateToken.Args,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.parse(principal), new CreateToken(createToken), signer);
  }

  createTokenAccount(
    principal: AccURL | string,
    createTokenAccount: CreateTokenAccount.Args,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(
      AccURL.parse(principal),
      new CreateTokenAccount(createTokenAccount),
      signer
    );
  }

  execute(tx: Transaction): Promise<any> {
    return this.call("execute", tx.toTxRequest());
  }

  issueTokens(
    principal: AccURL | string,
    issueTokens: IssueTokens.Args,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.parse(principal), new IssueTokens(issueTokens), signer);
  }

  sendTokens(
    principal: AccURL | string,
    sendTokens: SendTokens.Args,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.parse(principal), new SendTokens(sendTokens), signer);
  }

  updateAccountAuth(
    principal: AccURL | string,
    operation: AccountAuthOperation | AccountAuthOperation[],
    signer: TxSigner
  ): Promise<any> {
    const operations = operation instanceof Array ? operation : [operation];
    return this._execute(AccURL.parse(principal), new UpdateAccountAuth({ operations }), signer);
  }

  updateKey(principal: AccURL | string, updateKey: UpdateKey.Args, signer: TxSigner): Promise<any> {
    return this._execute(AccURL.parse(principal), new UpdateKey(updateKey), signer);
  }

  updateKeyPage(
    principal: AccURL | string,
    operation: KeyPageOperation | KeyPageOperation[],
    signer: TxSigner
  ): Promise<any> {
    const operations = operation instanceof Array ? operation : [operation];
    return this._execute(AccURL.parse(principal), new UpdateKeyPage({ operation: operations }), signer);
  }

  writeData(principal: AccURL | string, writeData: WriteData.Args, signer: TxSigner): Promise<any> {
    return this._execute(AccURL.parse(principal), new WriteData(writeData), signer);
  }

  private async _execute(principal: AccURL, payload: TransactionBody, signer: TxSigner): Promise<any> {
    const header = new Header(principal);
    const tx = new Transaction(payload, header);
    await tx.sign(signer);

    return this.execute(tx);
  }

  /******************
   * Others
   ******************/

  faucet(url: string | AccURL): Promise<any> {
    return this.call("faucet", {
      url: url.toString(),
    });
  }

  status(): Promise<any> {
    return this.call("status");
  }

  version(): Promise<any> {
    return this.call("version");
  }

  describe(): Promise<any> {
    return this.call("describe");
  }

  metrics(metric: string, duration: number): Promise<any> {
    return this.call("metrics", {
      metric,
      duration,
    });
  }
}
