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
    const data = {
      jsonrpc: "2.0",
      id: 0,
      method: method,
      params: params,
    };

    return axios
      .post(this._endpoint, data)
      .then((r) => {
        const { error, result } = r.data;
        if (error) {
          console.error(JSON.stringify(error, null, 4));
          throw new RpcError(error);
        } else {
          console.log(JSON.stringify(result, null, 4));
          return result;
        }
      })
      .catch((error) => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.log(error.response.data);
          console.log(error.response.status);
          console.log(error.response.headers);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          console.log(error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          console.log("Error", error.message);
        }
      });
  }
}
