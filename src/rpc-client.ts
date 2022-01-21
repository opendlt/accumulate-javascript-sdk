import axios, { AxiosInstance } from "axios";

export class RpcError extends Error {
  readonly code: number;
  readonly data?: any;

  constructor(err: any) {
    let message = err.message;
    if (err.data) {
      message += `: ${JSON.stringify(err.data, null, 4)}`;
    }
    super(message);
    this.code = err.code;
    this.data = err.data;
  }
}

export class RpcClient {
  private readonly _httpCli: AxiosInstance;
  private readonly _endpoint: string;
  private _idCounter: number;

  constructor(endpoint: string) {
    const httpCliOptions = {
      headers: { "Content-Type": "application/json" },
    };

    this._httpCli = axios.create(httpCliOptions);
    this._endpoint = endpoint;
    this._idCounter = 0;
  }

  async call(method: string, params: any): Promise<any> {
    const request = {
      jsonrpc: "2.0",
      id: this._idCounter++,
      method: method,
      params: params,
    };

    const {
      data: { error, result },
    } = await this._httpCli.post(this._endpoint, request);

    if (error) {
      return Promise.reject(new RpcError(error));
    } else {
      return result;
    }
  }
}
