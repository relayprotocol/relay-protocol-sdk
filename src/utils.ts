import { bytesToHex, Hex, hexToBytes } from "viem";
import bs58 from "bs58";
import { Address } from "@ton/core";
import { bech32, bech32m } from "bech32";

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

// bitocin base58 addresses will have a padding to be able to differentiate from bech32 addresses
const BVM_BASE58_ADDRESS_PADDING = [0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99, 0x99];

export const encodeAddress = (address: string, vmType: VmType): Uint8Array => {
  switch (vmType) {
    case "bitcoin-vm": {
      try {
        // P2PKH / P2SH
        const decoded = bs58.decode(address);
        return Buffer.from(new Uint8Array([...decoded, ...BVM_BASE58_ADDRESS_PADDING]));
      } catch {
        try {
          // P2WPKH
          const decodedBech32 = bech32.decode(address);
          // Store prefix length (1 byte), followed by prefix, then address data
          const prefixBytes = new TextEncoder().encode(decodedBech32.prefix);
          return Buffer.from(new Uint8Array([
            1, // type
            prefixBytes.length,  // Prefix length
            ...prefixBytes,      // Prefix data
            ...decodedBech32.words  // Address data
          ]));
        } catch {
          // P2TR
          const decodedBech32m = bech32m.decode(address);
          const prefixBytes = new TextEncoder().encode(decodedBech32m.prefix);
          return Buffer.from(new Uint8Array([
            2, // type
            prefixBytes.length,  // Prefix length
            ...prefixBytes,      // Prefix data
            ...decodedBech32m.words  // Address data
          ]));
        }
      }
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
      if (
        address
          .subarray(-BVM_BASE58_ADDRESS_PADDING.length)
          .every((v, i) => v === BVM_BASE58_ADDRESS_PADDING[i])
      ) {
        // P2PKH / P2SH
        return bs58.encode(address.subarray(0, -BVM_BASE58_ADDRESS_PADDING.length));
      } else {
        // Get prefix length
        const type = address[0];
        const prefixLength = address[1];
        console.log({
          type,
          prefixLength
        })
        if (prefixLength > 0) {
          // Extract prefix
          const prefix = new TextDecoder().decode(address.subarray(2, 2 + prefixLength));
          // Extract data
          const data = address.subarray(2 + prefixLength);
          if (type === 1) {
            return bech32.encode(prefix, data);
          } else if (type === 2) {
            return bech32m.encode(prefix, data);
          }
        }
      }
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
      return Buffer.from(transactionId, 'hex');
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
      return Buffer.from(transactionId).toString('hex');
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
