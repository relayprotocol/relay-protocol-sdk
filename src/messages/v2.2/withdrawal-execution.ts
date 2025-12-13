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
  currency: string;
  recipientAddress: string;
  owner: string;
  amount: bigint;
  withdrawalNonce?: number;
}

/**
 * Compute deterministic withdrawal address
 *
 * @param depositoryAddress the depository contract holding the funds on origin chain
 * @param depositoryChainId the chain id of the depository contract currently holding the funds
 * @param currency the id of the currency as expressed on origin chain (string)
 * @param recipientAddress the address that will receive the withdrawn funds on destination chain
 * @param owner the address that owns the balance before the withdrawal is initiated
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
        "string",
        "address",
        "address",
        "uint256",
        "uint256",
        "uint256",
      ],
      [
        withdrawalParams.depositoryAddress as `0x${string}`,
        withdrawalParams.depositoryChainId,
        withdrawalParams.currency,
        withdrawalParams.recipientAddress as `0x${string}`,
        withdrawalParams.owner as `0x${string}`,
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

// for oracle requests, we replace the hub chain id by a slug (e.g. 'base')
export type WithdrawalAddressRequest = Omit<
  WithdrawalAddressParams,
  "depositoryChainId"
> & {
  depositoryChainSlug: string;
};

// types for oracle routes
export type WithdrawalInitiationMessage = {
  data: WithdrawalAddressRequest & { settlementChainId: string };
  result: {
    withdrawalAddress: string;
  };
};

export type WithdrawalInitiatedMessage = {
  data: WithdrawalAddressRequest & { settlementChainId: string };
  result: {
    proofOfWithdrawalAddressBalance: string;
  };
};
