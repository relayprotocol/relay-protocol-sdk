import { bytesToHex, Hex, hexToBytes } from "viem";

export type VmType =
  | "ethereum-vm"
  | "solana-vm"
  | "tron-vm"
  | "ton-vm"
  | "sui-vm";

export type ChainIdToVmType = Record<number, VmType>;

export const getChainVmType = (
  chainId: number,
  chainsConfig: ChainIdToVmType
) => {
  if (!chainsConfig[chainId]) {
    throw new Error(`Unknown vm type for chain ${chainId}`);
  }

  return chainsConfig[chainId];
};

// Bytes encoding

export const encodeBytes = (bytes: string) => hexToBytes(bytes as Hex);

// Address encoding

export const encodeAddress = (address: string, vmType: VmType): Uint8Array => {
  switch (vmType) {
    case "ethereum-vm": {
      return hexToBytes(address as Hex);
    }

    default: {
      throw new Error("Vm type not implemented");
    }
  }
};

export const decodeAddress = (address: Uint8Array, vmType: VmType): string => {
  switch (vmType) {
    case "ethereum-vm": {
      return bytesToHex(address);
    }

    default: {
      throw new Error("Vm type not implemented");
    }
  }
};

// Transaction encoding

export const encodeTransactionId = (
  transactionId: string,
  vmType: VmType
): Uint8Array => {
  switch (vmType) {
    case "ethereum-vm": {
      return hexToBytes(transactionId as Hex);
    }

    default: {
      throw new Error("Vm type not implemented");
    }
  }
};

export const decodeTransactionId = (
  transactionId: Uint8Array,
  vmType: VmType
): string => {
  switch (vmType) {
    case "ethereum-vm": {
      return bytesToHex(transactionId);
    }

    default: {
      throw new Error("Vm type not implemented");
    }
  }
};
