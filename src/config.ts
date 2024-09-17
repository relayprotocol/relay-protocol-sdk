import { ChainVmType } from "./core/chains";

export const config = {
  port: Number(process.env.PORT!),
  chains: JSON.parse(process.env.CHAINS!) as {
    name: string;
    vmType: ChainVmType;
    rpcUrl: string;
  }[],
};
