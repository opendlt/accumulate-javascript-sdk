import { AccURL } from "./acc-url";
import { txRequestToParams, getTxRequest } from "./api/tx-request";
import { RpcClient } from "./rpc-client";
import { Payload } from "./payload";
import { OriginSigner, Signature } from "./origin-signer";
import { txDataToSign } from "./api/gen-transaction";
import { SignatureInfo } from "./api/signature-info";
import { AddCreditsArg, AddCredits } from "./payload/add-credits";
import { CreateIdentityArg, CreateIdentity } from "./payload/create-identity";
import { SendTokensArg, SendTokens } from "./payload/send-tokens";
import { CreateTokenAccountArg, CreateTokenAccount } from "./payload/create-token-account";
import { CreateKeyBookArg, CreateKeyBook } from "./payload/create-key-book";
import { CreateKeyPage, CreateKeyPageArg } from "./payload/create-key-page";
import { UpdateKeyPageArg, UpdateKeyPage } from "./payload/update-key-page";
import { CreateDataAccountArg, CreateDataAccount } from "./payload/create-data-account";

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

  execute(origin: AccURL, binary: Buffer, si: SignatureInfo, signature: Signature): Promise<void> {
    const txRequest = getTxRequest(origin, binary.toString("base64"), signature, si);

    return this._rpcClient.call("execute", txRequestToParams(txRequest));
  }

  _execute(payload: Payload, signer: OriginSigner): Promise<void> {
    const binary = payload.marshalBinary();
    const si = generateSignatureInfo(signer.url);
    const signature = signer.sign(txDataToSign(binary, si));

    return this.execute(signer.url, binary, si, signature);
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

function generateSignatureInfo(url: AccURL): SignatureInfo {
  return {
    url,
    nonce: Date.now(),
    keyPageHeight: 6,
    keyPageIndex: 0,
  };
}
