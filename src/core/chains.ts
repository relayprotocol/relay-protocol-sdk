import { config } from "../config";

export enum ChainVmType {
  Evm = "evm",
  Svm = "svm",
}

type ChainData = {
  vmType: ChainVmType;
  rpcUrl: string;
};

export const chains: Record<string, ChainData> = Object.fromEntries(
  config.chains.map((chain) => [
    chain.name,
    { vmType: chain.vmType, rpcUrl: chain.rpcUrl },
  ])
);
