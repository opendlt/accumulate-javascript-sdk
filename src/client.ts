import axios from "axios";
import { AccURL } from "./acc-url";

const ENDPOINT = "https://testnet.accumulatenetwork.io/v2";

export class Client {
  async apiCall(method: string, params: any): Promise<void> {
    const data = {
      jsonrpc: "2.0",
      id: 0,
      method: method,
      params: params,
    };

    console.log(params);

    return axios
      .post(ENDPOINT, data)
      .then((r) => {
        const { error, result } = r.data;
        if (error) {
          console.error(error);
        } else {
          console.log(result);
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

  faucet(url: AccURL): Promise<void> {
    return this.apiCall("faucet", {
      url: url.toString(),
    });
  }
}
