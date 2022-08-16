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
import { Payload } from "./payload";
import { AddCredits, AddCreditsArg } from "./payload/add-credits";
import { AddValidator, AddValidatorArg } from "./payload/add-validator";
import { BurnTokens, BurnTokensArg } from "./payload/burn-tokens";
import { CreateDataAccount, CreateDataAccountArg } from "./payload/create-data-account";
import { CreateIdentity, CreateIdentityArg } from "./payload/create-identity";
import { CreateKeyBook, CreateKeyBookArg } from "./payload/create-key-book";
import { CreateKeyPage, CreateKeyPageArg } from "./payload/create-key-page";
import { CreateToken, CreateTokenArg } from "./payload/create-token";
import { CreateTokenAccount, CreateTokenAccountArg } from "./payload/create-token-account";
import { IssueTokens, IssueTokensArg } from "./payload/issue-tokens";
import { RemoveValidator, RemoveValidatorArg } from "./payload/remove-validator";
import { SendTokens, SendTokensArg } from "./payload/send-tokens";
import { AccountAuthOperation, UpdateAccountAuth } from "./payload/update-account-auth";
import { UpdateKey, UpdateKeyArg } from "./payload/update-key";
import { KeyPageOperation, UpdateKeyPage } from "./payload/update-key-page";
import { UpdateValidatorKey, UpdateValidatorKeyArg } from "./payload/update-validator-key";
import { WriteData, WriteDataArg } from "./payload/write-data";
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
    return this.queryUrl(ANCHORS_URL.append(`#anchor/${anchor}`));
  }

  queryUrl(url: string | AccURL, options?: QueryOptions): Promise<any> {
    const urlStr = url.toString();

    return this.call("query", {
      url: urlStr,
      ...options,
    });
  }

  queryTx(txId: string, options?: TxQueryOptions): Promise<any> {
    // TODO: remove after https://gitlab.com/accumulatenetwork/accumulate/-/issues/43
    if (txId.startsWith("acc://")) {
      txId = txId.slice(6).split("@")[0];
    }

    return this.call("query-tx", {
      txid: txId,
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
    addCredits: AddCreditsArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new AddCredits(addCredits), signer);
  }

  addValidator(
    principal: AccURL | string,
    addValidator: AddValidatorArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new AddValidator(addValidator), signer);
  }

  burnTokens(
    principal: AccURL | string,
    burnTokens: BurnTokensArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new BurnTokens(burnTokens), signer);
  }

  createDataAccount(
    principal: AccURL | string,
    createDataAccount: CreateDataAccountArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(
      AccURL.toAccURL(principal),
      new CreateDataAccount(createDataAccount),
      signer
    );
  }

  createIdentity(
    principal: AccURL | string,
    createIdentity: CreateIdentityArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new CreateIdentity(createIdentity), signer);
  }

  createKeyBook(
    principal: AccURL | string,
    createKeyBook: CreateKeyBookArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new CreateKeyBook(createKeyBook), signer);
  }

  createKeyPage(
    principal: AccURL | string,
    createKeyPage: CreateKeyPageArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new CreateKeyPage(createKeyPage), signer);
  }

  createToken(
    principal: AccURL | string,
    createToken: CreateTokenArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new CreateToken(createToken), signer);
  }

  createTokenAccount(
    principal: AccURL | string,
    createTokenAccount: CreateTokenAccountArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(
      AccURL.toAccURL(principal),
      new CreateTokenAccount(createTokenAccount),
      signer
    );
  }

  execute(tx: Transaction): Promise<any> {
    return this.call("execute", tx.toTxRequest());
  }

  issueTokens(
    principal: AccURL | string,
    issueTokens: IssueTokensArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new IssueTokens(issueTokens), signer);
  }

  removeValidator(
    principal: AccURL | string,
    removeValidator: RemoveValidatorArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new RemoveValidator(removeValidator), signer);
  }

  sendTokens(
    principal: AccURL | string,
    sendTokens: SendTokensArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new SendTokens(sendTokens), signer);
  }

  updateAccountAuth(
    principal: AccURL | string,
    operation: AccountAuthOperation | AccountAuthOperation[],
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new UpdateAccountAuth(operation), signer);
  }

  updateKey(principal: AccURL | string, updateKey: UpdateKeyArg, signer: TxSigner): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new UpdateKey(updateKey), signer);
  }

  updateKeyPage(
    principal: AccURL | string,
    operation: KeyPageOperation | KeyPageOperation[],
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new UpdateKeyPage(operation), signer);
  }

  updateValidatorKey(
    principal: AccURL | string,
    updateValidatorKey: UpdateValidatorKeyArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(
      AccURL.toAccURL(principal),
      new UpdateValidatorKey(updateValidatorKey),
      signer
    );
  }

  writeData(principal: AccURL | string, writeData: WriteDataArg, signer: TxSigner): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new WriteData(writeData), signer);
  }

  private async _execute(principal: AccURL, payload: Payload, signer: TxSigner): Promise<any> {
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
