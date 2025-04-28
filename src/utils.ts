import { bytesToHex, Hex, hexToBytes } from "viem";
import bs58 from "bs58";
import { Address } from "@ton/core";

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
    case "sui-vm":
    case "ethereum-vm": {
      return hexToBytes(address as Hex);
    }

    case "solana-vm": {
      return bs58.decode(address);
    }

    case "ton-vm": {
      return Address.parse(address).toRaw();
    }

    default: {
      throw new Error("Vm type not implemented");
    }
  }
};

export const decodeAddress = (address: Uint8Array, vmType: VmType): string => {
  switch (vmType) {
    case "sui-vm":
    case "ethereum-vm": {
      return bytesToHex(address);
    }

    case "solana-vm": {
      return bs58.encode(address);
    }

    case "ton-vm": {
      const buf = Buffer.from(address);
      const hash = buf.subarray(0, 32);
      const workchain = buf[32];
      return new Address(workchain, hash).toString();
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

    case "solana-vm": {
      return bs58.decode(transactionId);
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

    case "solana-vm": {
      return bs58.encode(transactionId);
    }

    default: {
      throw new Error("Vm type not implemented");
    }
  }
};
