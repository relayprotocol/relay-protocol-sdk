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

export function getWithdrawalAddress(request: SubmitWithdrawRequest): string {
  const withdrawalHash = getSubmitWithdrawRequestHash(request);
  const withdrawalAddress = withdrawalHash.slice(2).slice(-40);
  return `0x${withdrawalAddress}` as `0x${string}`;
}
