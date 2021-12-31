import { AccURL } from "./acc-url";
import { LiteAccount } from "./lite-account";
import { txRequestToParams, getTxRequest } from "./api/tx-request";
import { RpcClient } from "./rpc-client";
import { Payload } from "./payload";
import { txDataToSign } from "./api/gen-transaction";
import { SignatureInfo } from "./api/signature-info";
import { AddCreditsArg, AddCredits } from "./protocol/add-credits";
import { CreateIdentityArg, CreateIdentity } from "./protocol/create-identity";
import { SendTokensArg, SendTokens } from "./protocol/send-tokens";
import { CreateTokenAccountArg, CreateTokenAccount } from "./protocol/create-token-account";
import { Identity } from "./identity";
import { Origin, Signature } from "./origin";

const TESTNET_ENDPOINT = "https://testnet.accumulatenetwork.io/v2";

export class Client {
  private readonly _rpcClient: RpcClient;

  constructor(endpoint?: string) {
    this._rpcClient = new RpcClient(endpoint || TESTNET_ENDPOINT);
  }

  async apiCall(method: string, params: any): Promise<void> {
    return this._rpcClient.call(method, params);
  }

  queryUrl(url: string | AccURL | Origin): Promise<void> {
    const urlStr = url instanceof LiteAccount ? url.url.toString() : url.toString();

    return this.apiCall("query", {
      url: urlStr,
    });
  }

  queryTx(txId: string): Promise<void> {
    return this.apiCall("query-tx", {
      txid: txId,
    });
  }

  faucet(url: AccURL): Promise<void> {
    return this.apiCall("faucet", {
      url: url.toString(),
    });
  }

  sendTokens(sendTokens: SendTokensArg, origin: Origin): Promise<void> {
    return this._execute(new SendTokens(sendTokens), origin);
  }

  addCredits(addCredits: AddCreditsArg, origin: LiteAccount): Promise<void> {
    return this._execute(new AddCredits(addCredits), origin);
  }

  createTokenAccount(createTokenAccount: CreateTokenAccountArg, origin: Identity): Promise<void> {
    return this._execute(new CreateTokenAccount(createTokenAccount), origin);
  }

  createIdentity(createIdentity: CreateIdentityArg, origin: LiteAccount): Promise<void> {
    return this._execute(new CreateIdentity(createIdentity), origin);
  }

  execute(origin: AccURL, binary: Buffer, si: SignatureInfo, signature: Signature): Promise<void> {
    const txRequest = getTxRequest(origin, binary.toString("base64"), signature, si);

    return this._rpcClient.call("execute", txRequestToParams(txRequest));
  }

  _execute(payload: Payload, origin: Origin): Promise<void> {
    const binary = payload.marshalBinary();
    const si = generateSignatureInfo(origin.url);
    const signature = origin.sign(txDataToSign(binary, si));

    return this.execute(origin.url, binary, si, signature);
  }
}

function generateSignatureInfo(url: AccURL): SignatureInfo {
  return {
    url,
    nonce: Date.now(),
    keyPageHeight: 1,
    keyPageIndex: 0,
  };
}
