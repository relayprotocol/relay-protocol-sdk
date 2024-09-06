export enum ChainVmType {
  Evm = "evm",
  Svm = "svm",
}

type ChainData = {
  vmType: ChainVmType;
  rpcUrl: string;
};

// TODO: These should come from a database instead

export type Chain = "ethereum" | "solana";

export const chains: Record<Chain, ChainData> = {
  // EVM
  ethereum: {
    vmType: ChainVmType.Evm,
    rpcUrl: process.env["RPC_URL_ETHEREUM"]!,
  },
  // SVM
  solana: {
    vmType: ChainVmType.Svm,
    rpcUrl: process.env["RPC_URL_SOLANA"]!,
  },
};
