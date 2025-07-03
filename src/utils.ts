import { bytesToHex, Hex, hexToBytes } from "viem";
import bs58 from "bs58";
import { Address } from "@ton/core";

export type VmType =
  | "bitcoin-vm"
  | "ethereum-vm"
  | "hyperliquid-vm"
  | "solana-vm"
  | "sui-vm"
  | "ton-vm"
  | "tron-vm";

export type ChainIdToVmType = Record<string, VmType>;

export const getChainVmType = (
  chainId: string,
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
    case "bitcoin-vm": {
      throw new Error("Vm type not implemented (encodeAddress)");
    }

    case "ethereum-vm": {
      return hexToBytes(address as Hex);
    }

    case "hyperliquid-vm": {
      return hexToBytes(address as Hex);
    }

    case "solana-vm": {
      return bs58.decode(address);
    }

    case "sui-vm": {
      return hexToBytes(address as Hex);
    }

    case "ton-vm": {
      return Address.parse(address).toRaw();
    }

    case "tron-vm": {
      throw new Error("Vm type not implemented (encodeAddress)");
    }
  }
};

export const decodeAddress = (address: Uint8Array, vmType: VmType): string => {
  switch (vmType) {
    case "bitcoin-vm": {
      throw new Error("Vm type not implemented (decodeAddress)");
    }

    case "ethereum-vm": {
      return bytesToHex(address);
    }

    case "hyperliquid-vm": {
      return bytesToHex(address);
    }

    case "solana-vm": {
      return bs58.encode(address);
    }

    case "sui-vm": {
      return bytesToHex(address);
    }

    case "ton-vm": {
      const buf = Buffer.from(address);
      const hash = buf.subarray(0, 32);
      const workchain = buf[32];
      return new Address(workchain, hash).toString();
    }

    case "tron-vm": {
      throw new Error("Vm type not implemented (encodeAddress)");
    }
  }
};

// Transaction encoding

export const encodeTransactionId = (
  transactionId: string,
  vmType: VmType
): Uint8Array => {
  switch (vmType) {
    case "bitcoin-vm": {
      throw new Error("Vm type not implemented (encodeTransactionId)");
    }

    case "ethereum-vm": {
      return hexToBytes(transactionId as Hex);
    }

    case "hyperliquid-vm": {
      return hexToBytes(transactionId as Hex);
    }

    case "solana-vm": {
      return bs58.decode(transactionId);
    }

    case "sui-vm": {
      throw new Error("Vm type not implemented (encodeTransactionId)");
    }

    case "ton-vm": {
      throw new Error("Vm type not implemented (encodeTransactionId)");
    }

    case "tron-vm": {
      throw new Error("Vm type not implemented (encodeTransactionId)");
    }
  }
};

export const decodeTransactionId = (
  transactionId: Uint8Array,
  vmType: VmType
): string => {
  switch (vmType) {
    case "bitcoin-vm": {
      throw new Error("Vm type not implemented (decodeTransactionId)");
    }

    case "ethereum-vm": {
      return bytesToHex(transactionId);
    }

    case "hyperliquid-vm": {
      return bytesToHex(transactionId);
    }

    case "solana-vm": {
      return bs58.encode(transactionId);
    }

    case "sui-vm": {
      throw new Error("Vm type not implemented (decodeTransactionId)");
    }

    case "ton-vm": {
      throw new Error("Vm type not implemented (decodeTransactionId)");
    }

    case "tron-vm": {
      throw new Error("Vm type not implemented (decodeTransactionId)");
    }
  }
};
