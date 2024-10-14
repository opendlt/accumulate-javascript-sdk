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
  debug = false;

  constructor(endpoint: string) {
    const httpCliOptions = {
      headers: { "Content-Type": "application/json" },
    };

    this._httpCli = axios.create(httpCliOptions);
    this._endpoint = endpoint;
    this._idCounter = 0;
  }

  async call(method: string, params: any): Promise<any>;
  async call(requests: { method: string; params: any }[]): Promise<any[]>;
  async call(method: string | { method: string; params: any }[], params?: any): Promise<any> {
    const single = typeof method === "string";
    const requests = (single ? [{ method, params }] : method).map(({ method, params }) => ({
      jsonrpc: "2.0",
      id: this._idCounter++,
      method,
      params,
    }));
    if (requests.length == 0) {
      return [];
    }

    const body = single ? requests[0] : requests;
    if (this.debug) {
      console.debug(`! ${this._endpoint}`);
      console.debug(`> ${JSON.stringify(body)}`);
    }
    const { data } = await this._httpCli.post(this._endpoint, body);
    if (this.debug) {
      console.debug(`< ${JSON.stringify(data)}`);
    }
    if (single) {
      const { error, result } = data;
      if (error) {
        return Promise.reject(new RpcError(error));
      }
      return result;
    }
    const results = [];
    for (const { error, result } of data) {
      if (error) {
        return Promise.reject(new RpcError(error));
      }
      results.push(result);
    }
    return results;
  }
}
