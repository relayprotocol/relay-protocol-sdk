import { TokenIdComponents } from "@relay-protocol/types"
export const tokenIdTestCases: Array<{
  name: string
  input: TokenIdComponents
  expectedValue: bigint
}> = [
  {
    expectedValue:
      5126370114286486119248922823807248445856144931672230102669788761404601632355n,
    input: {
      address: "0x0000000000000000000000000000000000000000",
      chainId: 1n,
      family: "ethereum-vm",
    },
    name: "ETH on Ethereum",
  },
  {
    expectedValue:
      101142405549722680701516949243527989485095939267215334056209565926507227943481n,
    input: {
      address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
      chainId: 1n,
      family: "bitcoin-vm",
    },
    name: "Bitcoin",
  },
  {
    expectedValue:
      108890717977569292143568470585265267208172758058844132994285904278323093890885n,
    input: {
      address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      chainId: 1n,
      family: "solana-vm",
    },
    name: "USDC on Solana",
  },
  {
    expectedValue:
      30815307311220170804965801606391678921022824512560571593430839734064343993402n,
    input: {
      address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      chainId: 8453n,
      family: "ethereum-vm",
    },
    name: "USDC on Base",
  },
]
