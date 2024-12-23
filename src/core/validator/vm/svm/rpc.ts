import { Connection } from "@solana/web3.js";
import axios, { AxiosRequestConfig } from "axios";

import { ChainConfig } from "../../types";

// https://gist.github.com/WilfredAlmeida/9adea27abb5958178c4370c5656e89b7
const axiosFetch = async (
  input: string | URL | globalThis.Request,
  init?: RequestInit,
  timeout?: number
): Promise<Response> => {
  // Add default headers
  if (!init || !init.headers) {
    init = {
      headers: {
        "Content-Type": "application/json",
      },
      ...init,
    };
  }

  const axiosHeaders = Array.from(new Headers(init.headers).entries()).reduce(
    (acc, [key, value]) => {
      (acc as any)[key] = value;
      return acc;
    },
    {}
  );

  const axiosConfig: AxiosRequestConfig = {
    data: init.body,
    headers: axiosHeaders,
    method: init.method,
    baseURL: input.toString(),
    validateStatus: () => true,
    timeout,
  };

  const axiosResponse = await axios.request(axiosConfig);

  const { data, status, statusText, headers } = axiosResponse;

  // Map headers from axios to fetch format
  const headersArray: [string, string][] = Object.entries(headers).map(
    ([key, value]) => [key, value]
  );

  const fetchHeaders = new Headers(headersArray);

  const response = new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: fetchHeaders,
  });

  return Promise.resolve(response);
};

export const getRpc = (chainData: ChainConfig) => {
  const rpc = new Connection(chainData.rpcUrl, {
    commitment: "confirmed",
    fetch: (input, init) => axiosFetch(input, init, chainData.rpcTimeoutInMs),
  });
  return rpc;
};
