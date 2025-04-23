import { hashStruct } from "viem";

import {
  ChainIdToVmType,
  encodeAddress,
  encodeBytes,
  encodeTransactionId,
  getChainVmType,
} from "../utils";

export type EscrowWithdrawalMessage = {
  onchainId: string;
  data: {
    chainId: number;
    transactionId: string;
  };
  result: {
    withdrawalId: string;
    escrow: string;
    currency: string;
    amount: string;
  };
};

export const getEscrowWithdrawalMessageHash = (
  message: EscrowWithdrawalMessage,
  chainsConfig: ChainIdToVmType
) => {
  const vmType = (chainId: number) => getChainVmType(chainId, chainsConfig);

  return hashStruct({
    types: {
      EscrowWithdrawal: [
        { name: "onchainId", type: "bytes32" },
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "chainId", type: "uint256" },
        { name: "transactionId", type: "bytes" },
      ],
      Result: [
        { name: "withdrawalId", type: "bytes32" },
        { name: "escrow", type: "bytes" },
        { name: "currency", type: "bytes" },
        { name: "amount", type: "uint256" },
      ],
    },
    primaryType: "EscrowWithdrawal",
    data: {
      onchainId: message.onchainId,
      data: {
        chainId: message.data.chainId,
        transactionId: encodeTransactionId(
          message.data.transactionId,
          vmType(message.data.chainId)
        ),
      },
      result: {
        withdrawalId: encodeBytes(message.result.withdrawalId),
        escrow: encodeAddress(
          message.result.escrow,
          vmType(message.data.chainId)
        ),
        currency: encodeAddress(
          message.result.currency,
          vmType(message.data.chainId)
        ),
        amount: message.result.amount,
      },
    },
  });
};
