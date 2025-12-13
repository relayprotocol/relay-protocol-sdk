import { Hex, Address, encodePacked, keccak256 } from "viem";

export interface SubmitWithdrawRequest {
  chainId: string; // chainId of the destination chain on which the user will withdraw
  depository: string; // address of the depository account
  currency: string;
  amount: string; // Amount to withdraw
  spender: string; // address of the account that owns the balance in the Hub contract (can be an alias)
  receiver: string; // Address of the account on the destination chain
  data: string; // add tional data
  nonce: string; // Nonce for replay protection
}

export const getSubmitWithdrawRequestHash = (
  request: SubmitWithdrawRequest
) => {
  // EIP712 type from RelayAllocator
  const PAYLOAD_TYPEHASH = keccak256(
    "SubmitWithdrawRequest(uint256 chainId,string depository,string currency,uint256 amount,address spender,string receiver,bytes data,bytes32 nonce)" as Hex
  );

  // Create EIP712 digest
  const digest = keccak256(
    encodePacked(
      [
        "bytes32",
        "uint256",
        "bytes32",
        "bytes32",
        "uint256",
        "address",
        "bytes32",
        "bytes32",
        "bytes32",
      ],
      [
        PAYLOAD_TYPEHASH,
        BigInt(request.chainId),
        keccak256(request.depository as Hex),
        keccak256(request.currency as Hex),
        BigInt(request.amount),
        request.spender as Address,
        keccak256(request.receiver as Hex),
        keccak256(request.data as Hex),
        request.nonce as Hex,
      ]
    )
  );

  // The withdrawal address is the digest itself (as a hex string)
  return digest;
};

export interface WithdrawalAddressParams {
  depositoryAddress: string;
  depositoryChainId: bigint;
  tokenId: bigint;
  recipientAddress: string;
  amount: bigint;
  withdrawalNonce?: number;
}

/**
 * Compute deterministic withdrawal address
 *
 * @param depositoryAddress the depository contract holding the funds on origin chain
 * @param depositoryChainId the hub chain id of the depository contract currently holding the funds
 * @param tokenId the token id on the hub
 * @param recipientAddress the address that will receive the withdrawn funds on destination chain
 * @param amount the balance to withdraw
 * @param blockNumber block number when the Oracle witnessed the balance
 * @param withdrawalNonce (optional) nonce to prevent collisions for similar withdrawals in the same block
 * @returns withdrawal address (in lower case)
 */
export function getWithdrawalAddress(
  withdrawalParams: WithdrawalAddressParams & {
    blockNumber: bigint;
  }
): string {
  // pack and hash data
  const hash = keccak256(
    encodePacked(
      [
        "address",
        "uint256",
        "uint256",
        "address",
        "uint256",
        "uint256",
        "uint256",
      ],
      [
        withdrawalParams.depositoryAddress as `0x${string}`,
        withdrawalParams.depositoryChainId,
        withdrawalParams.tokenId,
        withdrawalParams.recipientAddress as `0x${string}`,
        withdrawalParams.amount,
        withdrawalParams.blockNumber,
        BigInt(withdrawalParams.withdrawalNonce || 0),
      ]
    )
  );

  // get 40 bytes for an address
  const withdrawalAddress = hash.slice(2).slice(-40).toLowerCase();
  return `0x${withdrawalAddress}` as `0x${string}`;
}

// types for oracle routes
export type WithdrawalInitiationMessage = {
  data: {
    hubChainId: string;
    withdrawalAddressParams: WithdrawalAddressParams;
  };
  result: {
    withdrawalAddress: string;
  };
};

export type WithdrawalInitiatedMessage = {
  data: {
    hubChainId: string;
    withdrawalAddressParams: WithdrawalAddressParams;
  };
  result: {
    proofOfWithdrawalAddressBalance: string;
  };
};
