import { AccURL } from "./acc-url";
import { RpcClient } from "./rpc-client";
import { Payload } from "./payload";
import { OriginSigner } from "./origin-signer";
import { AddCreditsArg, AddCredits } from "./payload/add-credits";
import { CreateIdentityArg, CreateIdentity } from "./payload/create-identity";
import { SendTokensArg, SendTokens } from "./payload/send-tokens";
import { CreateTokenAccountArg, CreateTokenAccount } from "./payload/create-token-account";
import { CreateKeyBookArg, CreateKeyBook } from "./payload/create-key-book";
import { CreateKeyPage, CreateKeyPageArg } from "./payload/create-key-page";
import { UpdateKeyPageArg, UpdateKeyPage } from "./payload/update-key-page";
import { CreateDataAccountArg, CreateDataAccount } from "./payload/create-data-account";
import { WriteData, WriteDataArg } from "./payload/write-data";
import { Transaction, Header } from "./transaction";
import { QueryOptions, QueryPagination } from "./api-types";
import { CreateToken, CreateTokenArg } from "./payload/create-token";
import { BurnTokens, BurnTokensArg } from "./payload/burn-tokens";
import { IssueTokens, IssueTokensArg } from "./payload/issue-tokens";

const TESTNET_ENDPOINT = "https://testnet.accumulatenetwork.io/v2";

export class Client {
  private readonly _rpcClient: RpcClient;

  constructor(endpoint?: string) {
    this._rpcClient = new RpcClient(endpoint || TESTNET_ENDPOINT);
  }

  async call<T>(method: string, params?: any): Promise<T> {
    return this._rpcClient.call(method, params);
  }

  /******************
   * Queries
   ******************/

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

  async queryKeyPageHeight(url: string | AccURL, key: string | Uint8Array): Promise<number> {
    const {
      data: { keyPage },
    } = await this.queryKeyPageIndex(url, key);

    const res = await this.queryUrl(keyPage);
    return res.mainChain.height;
  }

  /******************
   * Transactions
   ******************/

  addCredits(addCredits: AddCreditsArg, signer: OriginSigner): Promise<any> {
    return this._execute(new AddCredits(addCredits), signer);
  }

  burnTokens(burnTokens: BurnTokensArg, signer: OriginSigner): Promise<any> {
    return this._execute(new BurnTokens(burnTokens), signer);
  }

  createDataAccount(createDataAccount: CreateDataAccountArg, signer: OriginSigner): Promise<any> {
    return this._execute(new CreateDataAccount(createDataAccount), signer);
  }

  createIdentity(createIdentity: CreateIdentityArg, signer: OriginSigner): Promise<any> {
    return this._execute(new CreateIdentity(createIdentity), signer);
  }

  createKeyBook(createKeyBook: CreateKeyBookArg, signer: OriginSigner): Promise<any> {
    return this._execute(new CreateKeyBook(createKeyBook), signer);
  }

  createKeyPage(createKeyPage: CreateKeyPageArg, signer: OriginSigner): Promise<any> {
    return this._execute(new CreateKeyPage(createKeyPage), signer);
  }

  createToken(createToken: CreateTokenArg, signer: OriginSigner): Promise<any> {
    return this._execute(new CreateToken(createToken), signer);
  }

  createTokenAccount(
    createTokenAccount: CreateTokenAccountArg,
    signer: OriginSigner
  ): Promise<any> {
    return this._execute(new CreateTokenAccount(createTokenAccount), signer);
  }

  execute(tx: Transaction): Promise<any> {
    return this.call("execute", tx.toTxRequest());
  }

  issueTokens(issueTokens: IssueTokensArg, signer: OriginSigner): Promise<any> {
    return this._execute(new IssueTokens(issueTokens), signer);
  }

  sendTokens(sendTokens: SendTokensArg, signer: OriginSigner): Promise<any> {
    return this._execute(new SendTokens(sendTokens), signer);
  }

  updateKeyPage(updateKeyPage: UpdateKeyPageArg, signer: OriginSigner): Promise<any> {
    return this._execute(new UpdateKeyPage(updateKeyPage), signer);
  }

  writeData(writeData: WriteDataArg, signer: OriginSigner): Promise<any> {
    return this._execute(new WriteData(writeData), signer);
  }

  private async _execute(payload: Payload, signer: OriginSigner): Promise<any> {
    const header = new Header(signer.origin, {
      keyPageHeight: signer.keyPageHeight,
      keyPageIndex: signer.keyPageIndex,
    });
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

  metrics(metric: string, duration: number): Promise<any> {
    return this.call("metrics", {
      metric,
      duration,
    });
  }
}
