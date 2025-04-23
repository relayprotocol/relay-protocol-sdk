import { hashStruct } from "viem";

import {
  ChainIdToVmType,
  encodeAddress,
  encodeBytes,
  encodeTransactionId,
  getChainVmType,
} from "../utils";

export type EscrowDepositMessage = {
  onchainId: string;
  data: {
    chainId: number;
    transactionId: string;
  };
  result: {
    depositId: string;
    escrow: string;
    depositor: string;
    currency: string;
    amount: string;
  };
};

export const getEscrowDepositMessageHash = (
  message: EscrowDepositMessage,
  chainsConfig: ChainIdToVmType
) => {
  const vmType = (chainId: number) => getChainVmType(chainId, chainsConfig);

  return hashStruct({
    types: {
      EscrowDeposit: [
        { name: "onchainId", type: "bytes32" },
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "chainId", type: "uint256" },
        { name: "transactionId", type: "bytes" },
      ],
      Result: [
        { name: "depositId", type: "bytes32" },
        { name: "escrow", type: "bytes" },
        { name: "depositor", type: "bytes" },
        { name: "currency", type: "bytes" },
        { name: "amount", type: "uint256" },
      ],
    },
    primaryType: "EscrowDeposit",
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
        depositId: encodeBytes(message.result.depositId),
        escrow: encodeAddress(
          message.result.escrow,
          vmType(message.data.chainId)
        ),
        depositor: encodeAddress(
          message.result.depositor,
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
