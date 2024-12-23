import axios, { AxiosRequestConfig } from "axios";
import { FetchRequest, JsonRpcProvider, toUtf8Bytes } from "ethers";

import { ChainConfig } from "../../types";

const axiosFetch = async (req: FetchRequest, timeoutInMs?: number) => {
  const axiosHeaders = Array.from(
    new Headers(
      req.headers ?? {
        "Content-Type": "application/json",
      }
    ).entries()
  ).reduce((acc, [key, value]) => {
    (acc as any)[key] = value;
    return acc;
  }, {});

  const axiosConfig: AxiosRequestConfig = {
    data: req.body,
    headers: axiosHeaders,
    method: req.method,
    baseURL: req.url,
    validateStatus: () => true,
    timeout: timeoutInMs,
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

  return {
    statusCode: response.status,
    statusMessage: response.statusText,
    body: toUtf8Bytes(await response.text()),
    headers: Object.fromEntries(response.headers.entries()),
  };
};

export const getRpc = (chainData: ChainConfig) => {
  const fetchRequest = new FetchRequest(chainData.rpcUrl);
  fetchRequest.getUrlFunc = (req) => axiosFetch(req, chainData.rpcTimeoutInMs);
  fetchRequest.setThrottleParams({
    maxAttempts: 1,
    slotInterval: 60000,
  });

  return new JsonRpcProvider(fetchRequest);
};
