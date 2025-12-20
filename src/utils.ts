import { bytesToHex, Hex, hexToBytes } from "viem";
import { bech32, bech32m } from "bech32";
import * as bitcoin from "bitcoinjs-lib";
import bs58 from "bs58";
import * as tronweb from "tronweb";

export type VmType =
  | "bitcoin-vm"
  | "ethereum-vm"
  | "hyperliquid-vm"
  | "solana-vm"
  | "sui-vm"
  | "ton-vm"
  | "tron-vm"
  | "lighter-vm";

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

// Native currencies

export const getVmTypeNativeCurrency = (vmType: VmType) => {
  switch (vmType) {
    case "bitcoin-vm":
      return "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8";
    case "ethereum-vm":
      return "0x0000000000000000000000000000000000000000";
    case "hyperliquid-vm":
      return "0x00000000000000000000000000000000";
    case "solana-vm":
      return "11111111111111111111111111111111";
    case "tron-vm":
      return "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb";
    case "lighter-vm":
      return "0";
    default:
      throw new Error(`Native currency not available for vm type ${vmType}`);
  }
};

// Bytes encoding

export const encodeBytes = (bytes: string) => hexToBytes(bytes as Hex);

// Address encoding

export const encodeAddress = (address: string, vmType: VmType): Uint8Array => {
  switch (vmType) {
    case "bitcoin-vm": {
      const getBitcoinAddressType = (
        address: string
      ): "p2pkh" | "p2sh" | "bech32" | "bech32m" => {
        if (address.startsWith("1")) {
          return "p2pkh";
        }

        if (address.startsWith("3")) {
          return "p2sh";
        }

        if (address.startsWith("bc1")) {
          const lower = address.toLowerCase();

          // Try Bech32 first (v0)
          try {
            const decoded = bech32.decode(lower, 90);
            if (decoded.prefix === "bc" && decoded.words[0] === 0) {
              return "bech32";
            }
          } catch (_) {}

          // Try Bech32m (v1+)
          try {
            const decoded = bech32m.decode(lower, 90);
            if (decoded.prefix === "bc" && decoded.words[0] >= 1) {
              return "bech32m";
            }
          } catch (_) {}
        }

        throw new Error("Unsupported address format");
      };

      const type = getBitcoinAddressType(address);
      if (type === "p2pkh" || type === "p2sh") {
        const decoded = bs58.decode(address);
        // Strip the checksum
        return decoded.slice(0, -4);
      } else {
        const decoder = type === "bech32" ? bech32 : bech32m;
        const { words } = decoder.decode(address);
        const version = words[0];
        const program = bech32.fromWords(words.slice(1));
        return Uint8Array.from([version, ...program]);
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
      throw new Error("Vm type not implemented (encodeAddress)");
    }

    case "tron-vm": {
      return hexToBytes(`0x${tronweb.utils.address.toHex(address)}`);
    }

    case "lighter-vm": {
      return hexToBytes(`0x${Number(address).toString(16).padStart(32, "0")}`);
    }

    default: {
      throw new Error(`Vm type not implemented (encodeAddress)`);
    }
  }
};

export const decodeAddress = (address: Uint8Array, vmType: VmType): string => {
  switch (vmType) {
    case "bitcoin-vm": {
      if (
        address.length === 21 &&
        (address[0] === 0x00 || address[0] === 0x05)
      ) {
        // Base58Check (P2PKH/P2SH)

        const checksum = bitcoin.crypto
          .hash256(Buffer.from(address))
          .slice(0, 4);
        const full = Buffer.concat([Buffer.from(address), checksum]);
        return bs58.encode(full);
      } else {
        // Bech32/Bech32m

        const version = address[0];
        const program = Array.from(address.slice(1));
        const words = [version, ...bech32.toWords(Uint8Array.from(program))];
        if (version === 0) {
          return bech32.encode("bc", words);
        } else {
          return bech32m.encode("bc", words);
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
      throw new Error("Vm type not implemented (decodeAddress)");
    }

    case "tron-vm": {
      return tronweb.utils.address.fromHex(bytesToHex(address).slice(2));
    }

    case "lighter-vm": {
      return Number("0x" + Buffer.from(address).toString("hex")).toString();
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
      return Uint8Array.from(Buffer.from(transactionId, "hex"));
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
      return hexToBytes(`0x${transactionId}`);
    }

    case "lighter-vm": {
      return hexToBytes(`0x${transactionId}`);
    }
  }
};

export const decodeTransactionId = (
  transactionId: Uint8Array,
  vmType: VmType
): string => {
  switch (vmType) {
    case "bitcoin-vm": {
      return Buffer.from(transactionId).toString("hex");
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
      return bytesToHex(transactionId).slice(2);
    }

    case "lighter-vm": {
      return bytesToHex(transactionId).slice(2);
    }
  }
};
