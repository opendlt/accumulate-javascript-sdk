import { AccURL } from "./acc-url";
import { RpcClient } from "./rpc-client";
import { Payload } from "./payload";
import { OriginSigner } from "./origin-signer";
import { SignatureInfo } from "./signature-info";
import { AddCreditsArg, AddCredits } from "./payload/add-credits";
import { CreateIdentityArg, CreateIdentity } from "./payload/create-identity";
import { SendTokensArg, SendTokens } from "./payload/send-tokens";
import { CreateTokenAccountArg, CreateTokenAccount } from "./payload/create-token-account";
import { CreateKeyBookArg, CreateKeyBook } from "./payload/create-key-book";
import { CreateKeyPage, CreateKeyPageArg } from "./payload/create-key-page";
import { UpdateKeyPageArg, UpdateKeyPage } from "./payload/update-key-page";
import { CreateDataAccountArg, CreateDataAccount } from "./payload/create-data-account";
import { WriteData, WriteDataArg } from "./payload/write-data";
import { Transaction } from "./transaction";

const TESTNET_ENDPOINT = "https://testnet.accumulatenetwork.io/v2";

export class Client {
  private readonly _rpcClient: RpcClient;

  constructor(endpoint?: string) {
    this._rpcClient = new RpcClient(endpoint || TESTNET_ENDPOINT);
  }

  async apiCall(method: string, params: any): Promise<void> {
    return this._rpcClient.call(method, params);
  }

  /******************
   * Queries
   ******************/

  queryUrl(url: string | AccURL | OriginSigner): Promise<void> {
    const urlStr = url instanceof OriginSigner ? url.url.toString() : url.toString();

    return this.apiCall("query", {
      url: urlStr,
    });
  }

  queryTx(txId: string): Promise<void> {
    return this.apiCall("query-tx", {
      txid: txId,
    });
  }

  /******************
   * Transactions
   ******************/

  sendTokens(sendTokens: SendTokensArg, signer: OriginSigner): Promise<void> {
    return this._execute(new SendTokens(sendTokens), signer);
  }

  addCredits(addCredits: AddCreditsArg, signer: OriginSigner): Promise<void> {
    return this._execute(new AddCredits(addCredits), signer);
  }

  createIdentity(createIdentity: CreateIdentityArg, signer: OriginSigner): Promise<void> {
    return this._execute(new CreateIdentity(createIdentity), signer);
  }

  createKeyBook(createKeyBook: CreateKeyBookArg, signer: OriginSigner): Promise<void> {
    return this._execute(new CreateKeyBook(createKeyBook), signer);
  }

  createKeyPage(createKeyPage: CreateKeyPageArg, signer: OriginSigner): Promise<void> {
    return this._execute(new CreateKeyPage(createKeyPage), signer);
  }

  updateKeyPage(updateKeyPage: UpdateKeyPageArg, signer: OriginSigner): Promise<void> {
    return this._execute(new UpdateKeyPage(updateKeyPage), signer);
  }

  createTokenAccount(
    createTokenAccount: CreateTokenAccountArg,
    signer: OriginSigner
  ): Promise<void> {
    return this._execute(new CreateTokenAccount(createTokenAccount), signer);
  }

  createDataAccount(createDataAccount: CreateDataAccountArg, signer: OriginSigner): Promise<void> {
    return this._execute(new CreateDataAccount(createDataAccount), signer);
  }

  writeData(writeData: WriteDataArg, signer: OriginSigner): Promise<void> {
    return this._execute(new WriteData(writeData), signer);
  }

  execute(tx: Transaction): Promise<void> {
    return this._rpcClient.call("execute", tx.toTxRequest());
  }

  private _execute(payload: Payload, signer: OriginSigner): Promise<void> {
    const si = generateSignatureInfo(signer);
    const tx = new Transaction(payload, si);
    tx.sign(signer);

    return this.execute(tx);
  }

  /******************
   * Others
   ******************/

  faucet(url: AccURL): Promise<void> {
    return this.apiCall("faucet", {
      url: url.toString(),
    });
  }
}

function generateSignatureInfo(signer: OriginSigner): SignatureInfo {
  return {
    url: signer.url,
    nonce: Date.now(),
    keyPageHeight: signer.keyPageHeigt,
    keyPageIndex: signer.keyPageIndex,
  };
}
