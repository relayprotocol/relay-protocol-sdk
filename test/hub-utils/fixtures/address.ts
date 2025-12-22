import { VirtualAddressComponents } from "@relay-protocol/types"

export const addressesTestCases: Array<{
  name: string
  input: VirtualAddressComponents
  expectedAddress: `0x${string}`
}> = [
  {
    expectedAddress: "0xb1AF659094F7CF6c3FfE7e4d056d968B0Fe58663",
    input: {
      address: "0x0000000000000000000000000000000000000000",
      chainId: 1n,
      family: "ethereum-vm",
    },
    name: "ETH on Ethereum", // '0x' + 64 hex characters
  },
  {
    expectedAddress: "0xa1e17A109f1909b54C5611c6655AFcbAF1F09239",
    input: {
      address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      chainId: 1n,
      family: "bitcoin-vm",
    },
    name: "Bitcoin",
  },
  {
    expectedAddress: "0xAa261e59fd53c7B115f1aae3918D416629ace745",
    input: {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      chainId: 1n,
      family: "solana-vm",
    },
    name: "USDC on Solana",
  },
  {
    expectedAddress: "0xe3c144E770F8547Df5aF51A2d4E84C9c289CcC3a",
    input: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      chainId: 8453n,
      family: "ethereum-vm",
    },
    name: "USDC on Base",
  },
]
