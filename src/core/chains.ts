export type Chain = "ethereum" | "solana";

type ChainVmType = "evm" | "svm";

type ChainData = {
  vmType: ChainVmType;
  rpcUrl: string;
};

export const chains: Record<Chain, ChainData> = {
  ethereum: { vmType: "evm", rpcUrl: process.env["RPC_URL_ETHEREUM"]! },
  solana: { vmType: "svm", rpcUrl: process.env["RPC_URL_SOLANA"]! },
};
