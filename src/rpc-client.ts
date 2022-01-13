import axios, { AxiosInstance } from "axios";

export class RpcError extends Error {
  readonly code: number;
  readonly data?: any;

  constructor(err: any) {
    super(err.message);
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

    console.log(params)

    try {
      const {
        data: { error, result },
      } = await this._httpCli.post(this._endpoint, request);

      if (error) {
        console.error("error", method, JSON.stringify(error, null, 4));
        return Promise.reject(new RpcError(error));
      } else {
        console.log("success", method, JSON.stringify(result, null, 4));
        return result;
      }
    } catch (error: any) {
      console.log("Error message", error.message);
      console.log("Error code", error.code);
      console.log("Erro numberr", error.errno);

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.log(error.response.data);
        console.log(error.response.status);
        console.log(error.response.headers);
      }
    }
  }
}
