import { getAddress, keccak256, encodePacked } from "viem";
import { VmType } from "../../utils";

export interface TokenIdComponents {
  family: VmType;
  chainId: bigint;
  address: string;
}

export interface VirtualAddressComponents {
  family: VmType;
  chainId: bigint;
  address: string;
}

export type TokenId = bigint;
export type VirtualAddress = `0x${string}`;

export const getCheckSummedAddress = (family: string, address: string) => {
  const checksummedAddress =
    family === "ethereum-vm" ? getAddress(address) : address;
  return checksummedAddress;
};

/**
 * Generates a virtual Ethereum address from token components
 * @param components The token components (family, chainId, address)
 * @returns A checksummed Ethereum address derived from the token ID
 * @remarks This function first generates a token ID using the components,
 * then converts the last 20 bytes of the hash to an Ethereum address.
 * This is equivalent to the Solidity: address(uint160(uint256(addressHash)))
 */

export function generateAddress(
  components: VirtualAddressComponents
): VirtualAddress {
  const { chainId, address, family } = components;
  const addressHash = keccak256(
    encodePacked(
      ["string", "uint256", family === "ethereum-vm" ? "address" : "string"],
      [family, chainId, getCheckSummedAddress(family, address)]
    )
  );
  const addressBytes = addressHash.slice(2).slice(-40);
  return getAddress("0x" + addressBytes) as `0x${string}`;
}

/**
 * Generates a token ID based on the chain type, chain ID, and address
 * @param components The token components (family, chainId, address)
 * @returns The keccak256 hash of the token components
 */
export function generateTokenId(components: TokenIdComponents): TokenId {
  const { family, chainId, address } = components;
  const packedData = encodePacked(
    ["string", "uint256", family === "ethereum-vm" ? "address" : "string"],
    [family, chainId, getCheckSummedAddress(family, address)]
  );
  return BigInt(keccak256(packedData));
}

export const generateIntentAddress = (intentId: string): VirtualAddress => {
  const addressHash = keccak256(encodePacked(["string"], [intentId]));
  return getAddress("0x" + addressHash.slice(2).slice(-40)) as `0x${string}`;
};
