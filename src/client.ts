import { AccURL } from "./acc-url";
import { LiteAccount, Signature } from "./lite-account";
import { txRequestToParams, getTxRequest } from "./api/tx-request";
import { SendTokens, marshalBinarySendTokens } from "./protocol/send-tokens";
import { txDataToSign } from "./api/gen-transaction";
import { u64 } from "./bigint";
import { AddCredits, marshalBinaryAddCredits } from "./protocol/add-credits";
import { SignatureInfo } from "./api/signature-info";
import { RpcClient } from "./rpc-client";

const TESTNET_ENDPOINT = "https://testnet.accumulatenetwork.io/v2";

export class Client {
  private _rpcClient: RpcClient;

  constructor(endpoint?: string) {
    this._rpcClient = new RpcClient(endpoint || TESTNET_ENDPOINT);
  }

  async apiCall(method: string, params: any): Promise<void> {
    return this._rpcClient.call(method, params);
  }

  faucet(url: AccURL): Promise<void> {
    return this.apiCall("faucet", {
      url: url.toString(),
    });
  }

  sendTokens(sendTokens: SendTokens, acc: LiteAccount): Promise<void> {
    return this._execute(marshalBinarySendTokens(sendTokens), acc);
  }

  addCredits(addCredits: AddCredits, acc: LiteAccount): Promise<void> {
    return this._execute(marshalBinaryAddCredits(addCredits), acc);
  }

  execute(
    origin: AccURL,
    binary: Buffer,
    si: SignatureInfo,
    signature: Signature
  ): Promise<void> {
    const txRequest = getTxRequest(
      origin,
      binary.toString("base64"),
      signature,
      si
    );

    return this._rpcClient.call("execute", txRequestToParams(txRequest));
  }

  _execute(binary: Buffer, acc: LiteAccount): Promise<void> {
    const si = generateSignatureInfo(acc.getUrl());
    const signature = acc.sign(txDataToSign(binary, si));

    return this.execute(acc.getUrl(), binary, si, signature);
  }
}

function generateSignatureInfo(url: AccURL): SignatureInfo {
  return {
    url,
    nonce: new u64(Date.now()),
    keyPageHeight: new u64(1),
    keyPageIndex: new u64(0),
  };
}
