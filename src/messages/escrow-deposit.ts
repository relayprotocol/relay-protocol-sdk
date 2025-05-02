import { hashStruct } from "viem";

import {
  ChainIdToVmType,
  encodeAddress,
  encodeBytes,
  encodeTransactionId,
  getChainVmType,
} from "../utils";

export type EscrowDepositMessage = {
  data: {
    chainId: string;
    transactionId: string;
  };
  result: {
    onchainId: string;
    escrow: string;
    depositId: string;
    depositor: string;
    currency: string;
    amount: string;
  };
};

export const getEscrowDepositMessageId = (
  message: EscrowDepositMessage,
  chainsConfig: ChainIdToVmType
) => {
  const vmType = (chainId: string) => getChainVmType(chainId, chainsConfig);

  return hashStruct({
    types: {
      EscrowDeposit: [
        { name: "data", type: "Data" },
        { name: "result", type: "Result" },
      ],
      Data: [
        { name: "chainId", type: "string" },
        { name: "transactionId", type: "bytes" },
      ],
      Result: [
        { name: "onchainId", type: "bytes32" },
        { name: "escrow", type: "bytes" },
        { name: "depositId", type: "bytes32" },
        { name: "depositor", type: "bytes" },
        { name: "currency", type: "bytes" },
        { name: "amount", type: "uint256" },
      ],
    },
    primaryType: "EscrowDeposit",
    data: {
      data: {
        chainId: message.data.chainId,
        transactionId: encodeTransactionId(
          message.data.transactionId,
          vmType(message.data.chainId)
        ),
      },
      result: {
        onchainId: encodeBytes(message.result.onchainId),
        escrow: encodeAddress(
          message.result.escrow,
          vmType(message.data.chainId)
        ),
        depositId: encodeBytes(message.result.depositId),
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
