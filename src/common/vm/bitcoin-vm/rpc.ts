import { MempoolSpaceConnection } from "./utils/mempool-space-connection";
import { RpcConnection } from "./utils/rpc-connection";

export const createProvider = (rpcUrl: string) => {
  if (rpcUrl.includes("mempool.space")) {
    return new MempoolSpaceConnection(rpcUrl);
  }
  return new RpcConnection(rpcUrl);
};
