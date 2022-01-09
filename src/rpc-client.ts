import axios from "axios";

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
  private readonly _endpoint: string;

  constructor(endpoint: string) {
    this._endpoint = endpoint;
  }

  async call(method: string, params: any): Promise<any> {
    const request = {
      jsonrpc: "2.0",
      id: 0,
      method: method,
      params: params,
    };

    try {
      const {
        data: { error, result },
      } = await axios.post(this._endpoint, request);

      if (error) {
        console.error("error", JSON.stringify(error, null, 4));
        return Promise.reject(new RpcError(error));
      } else {
        console.log("success", JSON.stringify(result, null, 4));
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
