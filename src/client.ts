import { AccURL } from "./acc-url";
import { ACME_ORACLE_URL } from "./acme";
import { QueryOptions, QueryPagination } from "./api-types";
import { Payload } from "./payload";
import { AddCredits, AddCreditsArg } from "./payload/add-credits";
import { BurnTokens, BurnTokensArg } from "./payload/burn-tokens";
import { CreateDataAccount, CreateDataAccountArg } from "./payload/create-data-account";
import { CreateIdentity, CreateIdentityArg } from "./payload/create-identity";
import { CreateKeyBook, CreateKeyBookArg } from "./payload/create-key-book";
import { CreateKeyPage, CreateKeyPageArg } from "./payload/create-key-page";
import { CreateToken, CreateTokenArg } from "./payload/create-token";
import { CreateTokenAccount, CreateTokenAccountArg } from "./payload/create-token-account";
import { IssueTokens, IssueTokensArg } from "./payload/issue-tokens";
import { SendTokens, SendTokensArg } from "./payload/send-tokens";
import { KeyPageOperation, UpdateKeyPage } from "./payload/update-key-page";
import { WriteData, WriteDataArg } from "./payload/write-data";
import { RpcClient } from "./rpc-client";
import { Header, Transaction } from "./transaction";
import { TxSigner } from "./tx-signer";

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
    return this.queryData(ACME_ORACLE_URL).then(
      (r) => JSON.parse(Buffer.from(r.data.entry.data[0], "hex").toString()).price
    );
  }

  queryUrl(url: string | AccURL): Promise<any> {
    const urlStr = url.toString();

    return this.call("query", {
      url: urlStr,
    });
  }

  queryTx(txId: string): Promise<any> {
    return this.call("query-tx", {
      txid: txId,
    });
  }

  queryTxHistory(url: string | AccURL, pagination: QueryPagination): Promise<any> {
    const urlStr = url.toString();
    return this.call("query-tx-history", {
      url: urlStr,
      ...pagination,
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

  sendTokens(
    principal: AccURL | string,
    sendTokens: SendTokensArg,
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new SendTokens(sendTokens), signer);
  }

  updateKeyPage(
    principal: AccURL | string,
    operation: KeyPageOperation | KeyPageOperation[],
    signer: TxSigner
  ): Promise<any> {
    return this._execute(AccURL.toAccURL(principal), new UpdateKeyPage(operation), signer);
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

  faucet(url: AccURL): Promise<any> {
    return this.call("faucet", {
      url: url.toString(),
    });
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
